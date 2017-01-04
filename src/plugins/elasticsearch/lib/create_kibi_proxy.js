var createAgent = require('./create_agent');
var mapUri = require('./map_uri');
var _ = require('lodash');

var util = require('./util');

var dbfilter = require('./dbfilter');
var inject = require('./inject');

module.exports = function createProxy(server, method, route, config) {
  var filterJoinSet = require('./filter_join')(server).set;
  var filterJoinSequence = require('./filter_join')(server).sequence;

  var serverConfig = server.config();

  var pre = '/elasticsearch';
  var sep = route[0] === '/' ? '' : '/';
  var path = `${pre}${sep}${route}`;
  var options = {
    method: method,
    path: path,
    config: {
      timeout: {
        socket: serverConfig.get('elasticsearch.requestTimeout')
      }
    },
    handler: {
      kibi_proxy: {
        modifyPayload: (request) => {
          const req = request.raw.req;
          return new Promise((fulfill, reject) => {
            const chunks = [];
            req.on('error', reject);
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
              const dataToPass = {
                savedQueries: {} //TODO: Stephane I think this should be an array - for now it works as there is only one inject;
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
                var credentials = serverConfig.has('shield.cookieName') ? request.state[serverConfig.get('shield.cookieName')] : null;
                if (request.auth && request.auth.credentials && request.auth.credentials.proxyCredentials) {
                  credentials = request.auth.credentials.proxyCredentials;
                }
                return dbfilter(server.plugins.kibi_core.getQueryEngine(), query, credentials);
              }).map((query) => filterJoinSet(query))
              .map((query) => filterJoinSequence(query))
              .then((data) => {
                var buffers = _.map(data, function (query) {
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
                server.log(['error','create_proxy'], 'Something went wrong while modifying request: ' + errStr);
                reject(err);
              });
            });
          });
        },
        modifyResponse: (response, dataPassed) => {
          return new Promise((fulfill, reject) => {
            if (_.size(dataPassed.savedQueries) === 0) {
              fulfill({
                response: response,
                data: dataPassed
              });
              return;
            }

            const chunks = [];

            response.on('error', reject);
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
              const data = Buffer.concat(chunks);
              if (data.length !== 0) {
                inject.runSavedQueries(JSON.parse(data.toString()), server.plugins.kibi_core.getQueryEngine(), dataPassed.savedQueries)
                  .then((r) => {
                    dataPassed.body = new Buffer(JSON.stringify(r));
                    fulfill({
                      response: response,
                      data: dataPassed
                    });
                  }).catch((err) => {
                    server.log(['error','create_proxy'], 'Something went wrong while modifying response: ' + err.stack);
                    reject(err);
                  });
              } else {
                fulfill({
                  response: response,
                  data: dataPassed
                });
              }
            });
          });
        },
        timeout: serverConfig.get('elasticsearch.requestTimeout'),
        mapUri: mapUri(server, null, true),
        passThrough: true,
        agent: createAgent(server),
        xforward: true
      }
    }
  };

  _.assign(options.config, config);

  server.route(options);
};
