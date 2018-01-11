import createAgent from './create_agent';
import mapUri from './map_uri';
import { resolve } from 'url';
import { map, size, assign } from 'lodash';
import util from './util';

import sirenJoinModule from './siren_join';
import dbfilter from './dbfilter';
import inject from './inject';


// kibi: imports
import { getConfigMismatchErrorMessage } from './misconfigured_custom_cluster_errors';
// kibi: end

const createPath = function (prefix, path) {
  path = path[0] === '/' ? path : `/${path}`;
  prefix = prefix[0] === '/' ? prefix : `/${prefix}`;

  return `${prefix}${path}`;
};

module.exports = function createProxy(server, method, path, config) {
  const sirenJoin = sirenJoinModule(server);
  const serverConfig = server.config();


  const proxies = new Map([
    ['/elasticsearch', server.plugins.elasticsearch.getCluster('data')],
    ['/es_admin', server.plugins.elasticsearch.getCluster('admin')]
  ]);


  // kibi: add a proxy for connector plugin
  let connectorAdminCluster = 'data';
  if (serverConfig.has('elasticsearch.siren.connector.admin.cluster')) {
    const clusterName =  serverConfig.get('elasticsearch.siren.connector.admin.cluster');
    const clustersConfig = serverConfig.get('elasticsearch.siren.clusters');
    if (clusterName && clustersConfig && clustersConfig[clusterName]) {
      connectorAdminCluster = clusterName;
    } else {
      server.log(['error', 'elasticsearch'], getConfigMismatchErrorMessage(clusterName));
    }
  }
  proxies.set('/connector_elasticsearch', server.plugins.elasticsearch.getCluster(connectorAdminCluster));

  function getCredentials(request) {
    let credentials = serverConfig.has('xpack.security.cookieName') ? request.state[serverConfig.get('xpack.security.cookieName')] : null;
    if (request.auth && request.auth.credentials && request.auth.credentials.proxyCredentials) {
      credentials = request.auth.credentials.proxyCredentials;
    }
    return credentials;
  }

  /**
  * Sends the proxied response to the client.
  *
  * @param reply - reply interface
  * @param buffer - data buffer
  * @param upstream - the upstream response
  * @param ttl - The upstream ttl as returned by h2o2.
  */
  function sendResponse(reply, buffer, upstream, ttl) {
    if (upstream.headers.location) {
      // TODO: Workaround for #8705 until hapi has been updated to >= 15.0.0
      upstream.headers.location = encodeURI(upstream.headers.location);
    }

    reply(buffer)
    .code(upstream.statusCode)
    .ttl(ttl)
    .headers = upstream.headers;
  }

  const handler = {
    kibi_proxy: {
      onBeforeSendRequest: (request) => {
        const req = request.raw.req;

        return new Promise((fulfill, reject) => {
          const chunks = [];
          req.on('error', reject);
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => {
            const dataToPass = {
              savedQueries: {},
              credentials: {}
            };

            // prevent the string to be created
            if (serverConfig.get('logging.verbose')) {
              server.log(
                ['debug', 'kibi_proxy', 'raw kibi query'],
                `\n-------------------------\n${req.url}\n${Buffer.concat(chunks).toString()}\n-------------------------`
              );
            }

            if (req.url ===  '/elasticsearch/_siren/license') {
              return fulfill({
                payload: Buffer.concat(chunks),
                data: dataToPass
              });
            } else {
              /* Manipulate a set of queries, at the end of which the resulting queries
              * must be concatenated back into a Buffer. The queries in the body are
              * separated by a newline.
              */
              util.getQueriesAsPromise(Buffer.concat(chunks)).map((query) => {
                // Remove the custom queries from the body
                dataToPass.savedQueries = inject.save(query);
                return query;
              }).map((query) => {
                const credentials = getCredentials(request);
                dataToPass.credentials = credentials;
                return dbfilter(server.plugins.query_engine.getQueryEngine(), query, credentials);
              }).map((query) => sirenJoin.set(query))
              .map((query) => sirenJoin.sequence(query))
              .then((data) => {
                const buffers = map(data, function (query) {
                  return new Buffer(JSON.stringify(query) + '\n');
                });

                // prevent the string to be created
                if (serverConfig.get('logging.verbose')) {
                  server.log(
                    ['debug', 'kibi_proxy', 'translated elasticsearch query'],
                    '\n-------------------------\n' +
                    Buffer.concat(buffers).toString() + '\n' +
                    '-------------------------'
                  );
                }

                fulfill({
                  payload: Buffer.concat(buffers),
                  data: dataToPass
                });
              }).catch((err) => {
                let errStr;
                if (typeof err === 'object' && err.stack) {
                  errStr = err.toString();
                } else {
                  errStr = JSON.stringify(err, null, ' ');
                }
                server.log(['error','create_kibi_proxy'], 'Something went wrong while modifying request: ' + errStr);
                reject(err);
              });
            }
          });
        });
      },
      onResponse: (err, response, request, reply, settings, ttl, dataPassed) => {
        if (err) {
          reply(err);
          return;
        }

        const chunks = [];

        if (response === null || response === undefined) {
          server.log(['error','create_kibi_proxy'], 'Something went wrong response is: ' + response);
          return;
        }

        response.on('error', error => reply(error));
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const data = Buffer.concat(chunks);

          if (size(dataPassed.savedQueries) === 0) {
            sendResponse(reply, data, response, ttl);
            return;
          }

          if (data.length !== 0) {
            inject.runSavedQueries(JSON.parse(data.toString()), server.plugins.query_engine.getQueryEngine(), dataPassed.savedQueries,
            dataPassed.credentials)
            .then((r) => {
              sendResponse(reply, new Buffer(JSON.stringify(r)), response, ttl);
            }).catch((err) => {
              server.log(['error','create_kibi_proxy'], 'Something went wrong while modifying response: ' + err.stack);
              reply(err);
            });
          } else {
            reply(new Error('There is no data in response.'));
          }
        });
      }
    }
  };

  for (const [proxyPrefix, cluster] of proxies) {
    const options = {
      method,
      path: createPath(proxyPrefix, path),
      config: {
        timeout: {
          socket: cluster.getRequestTimeout()
        }
      },
      handler
    };

    assign(options.config, config);
    assign(options.handler.kibi_proxy, {
      mapUri: mapUri(cluster, proxyPrefix, server, true),
      agent: createAgent({
        url: cluster.getUrl(),
        ssl: cluster.getSsl()
      }),
      xforward: true,
      // required to pass through request headers
      timeout: cluster.getRequestTimeout()
    });

    server.route(options);
  }
};
