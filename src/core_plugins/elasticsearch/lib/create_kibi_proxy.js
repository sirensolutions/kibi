import createAgent from './create_agent';
import mapUri from './map_uri';
import { resolve } from 'url';
import { map, size, assign } from 'lodash';
import util from './util';

import sirenJoinModule from './siren_join';
import dbfilter from './dbfilter';
import inject from './inject';

const createPath = function (prefix, path) {
  path = path[0] === '/' ? path : `/${path}`;
  prefix = prefix[0] === '/' ? prefix : `/${prefix}`;

  return `${prefix}${path}`;
};

module.exports = function createProxy(server, method, path, config) {
  const sirenJoin = sirenJoinModule(server);

  const proxies = new Map([
    ['/elasticsearch', server.plugins.elasticsearch.getCluster('data')],
    ['/es_admin', server.plugins.elasticsearch.getCluster('admin')]
  ]);

  const serverConfig = server.config();
  function getCredentials(request) {
    let credentials = serverConfig.has('shield.cookieName') ? request.state[serverConfig.get('shield.cookieName')] : null;
    if (request.auth && request.auth.credentials && request.auth.credentials.proxyCredentials) {
      credentials = request.auth.credentials.proxyCredentials;
    }
    return credentials;
  }

  /*
  * Assign custom headers to reply() h2o2 interface headers.
  * reply - reply interface;
  * buffer - data buffer;
  * headers - headers to assign for reply;
  */
  function replyWithHeaders(reply, buffer, headers) {
    if (headers.location) {
      // TODO: Workaround for #8705 until hapi has been updated to >= 15.0.0
      headers.location = encodeURI(headers.location);
    }

    reply(buffer).headers = headers;
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
              savedQueries: {}, //TODO: Stephane I think this should be an array - for now it works as there is only one inject;
              credentials: {}
            };

            // prevent the string to be created
            if (serverConfig.get('logging.verbose')) {
              server.log(
                ['debug', 'kibi_proxy', 'raw kibi query'],
                `\n-------------------------\n${req.url}\n${Buffer.concat(chunks).toString()}\n-------------------------`
              );
            }

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
              return dbfilter(server.plugins.kibi_core.getQueryEngine(), query, credentials);
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
          });
        });
      },
      onResponse: (err, response, request, reply, settings, ttl, dataPassed) => {
        //if (response.headers.location) {
        //  // TODO: Workaround for #8705 until hapi has been updated to >= 15.0.0
        //  response.headers.location = encodeURI(response.headers.location);
        //}

        const chunks = [];

        response.on('error', (error) => {
          reply(error);
          return;
        });
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const data = Buffer.concat(chunks);

          if (size(dataPassed.savedQueries) === 0) {
            replyWithHeaders(reply, data, response.headers);
            return;
          }

          if (data.length !== 0) {
            inject.runSavedQueries(JSON.parse(data.toString()), server.plugins.kibi_core.getQueryEngine(), dataPassed.savedQueries,
                dataPassed.credentials)
              .then((r) => {
                replyWithHeaders(reply, new Buffer(JSON.stringify(r)), response.headers);
              }).catch((err) => {
                server.log(['error','create_kibi_proxy'], 'Something went wrong while modifying response: ' + err.stack);
                reply(err);
              });
          } else {
            reply({});
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
      timeout: cluster.getRequestTimeout(),
      onResponse: handler.kibi_proxy.onResponse
    });

    server.route(options);
  }
};
