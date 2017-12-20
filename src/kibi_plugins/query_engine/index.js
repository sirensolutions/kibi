import { each, isString } from 'lodash';
import http from 'http';
import path from 'path';
import Boom from 'boom';
import errors from 'request-promise/errors';
import buffer from 'buffer';

import cryptoHelper from './lib/crypto_helper';
import datasourcesSchema from './lib/datasources_schema';
import QueryEngine from './lib/query_engine';
import IndexHelper from './lib/index_helper';

/**
 * The Query engine plugin.
 *
 * The plugin exposes the following methods to other hapi plugins:
 *
 * - getQueryEngine: returns an instance of QueryEngine.
 * - getIndexHelper: returns an instance of IndexHelper.
 * - getCryptoHelper: returns an instance of CryptoHelper.
 */

module.exports = function (kibana) {
  let queryEngine;
  let indexHelper;

  const _validateQueryDefs = function (queryDefs) {
    if (queryDefs && queryDefs instanceof Array) {
      return true;
    }
    return false;
  };

  const queryEngineHandler = function (server, method, req, reply) {
    const params = req.query;
    let options = {};
    let queryDefs = [];

    if (params.options) {
      try {
        options = JSON.parse(params.options);
      } catch (e) {
        server.log(['error', 'query_engine'], 'Could not parse options [' + params.options + '] for method [' + method + '].');
      }
    }

    if (params.queryDefs) {
      try {
        queryDefs = JSON.parse(params.queryDefs);
      } catch (e) {
        server.log(['error', 'query_engine'], 'Could not parse queryDefs [' + params.queryDefs + '] for method [' + method + '].');
      }
    }

    if (_validateQueryDefs(queryDefs) === false) {
      return reply({
        query: '',
        error: 'queryDefs should be an Array of queryDef objects'
      });
    }

    const config = server.config();
    if (config.has('xpack.security.cookieName')) {
      options.credentials = req.state[config.get('xpack.security.cookieName')];
    }
    if (req.auth && req.auth.credentials && req.auth.credentials.proxyCredentials) {
      options.credentials = req.auth.credentials.proxyCredentials;
    }
    queryEngine[method](queryDefs, options)
      .then(function (queries) {
        // check if error is returned, reply with error property
        let queryError = '';
        const errors = each(queries, query => {
          if (query.error) {
            queryError = query.error;
          }
        });
        return reply({
          query: params,
          snippets: queries,
          error: queryError
        });
      }).catch(function (error) {
        let err;
        if (error instanceof Error) {
          err = Boom.wrap(error, 400);
        } else {
        //When put additional data in badRequest() it's not be used. So we need to add error.message manually
          const msg = 'Failed to execute query on an external datasource' + (error.message ? ': ' + error.message : '');
          err = Boom.badRequest(msg);
        }
        return reply(err);
      });
  };


  return new kibana.Plugin({
    require: ['kibana','kibi_core','saved_objects_api'],
    id: 'query_engine',

    init: function (server, options) {
      const config = server.config();
      const datasourceCacheSize = config.get('kibi_core.datasource_cache_size');


      this.status.yellow('Initialising the query engine');
      queryEngine = new QueryEngine(server);
      queryEngine._init(datasourceCacheSize).then((data) => {
        server.log(['info', 'query_engine'], data);
        this.status.green('Query engine initialized');
      }).catch((err) => {
        server.log(['error', 'query_engine'], err);
        this.status.red('Query engine initialization failed');
      });

      server.expose('getQueryEngine', () => queryEngine);

      server.expose('getCryptoHelper', () => cryptoHelper);

      indexHelper = new IndexHelper(server);
      server.expose('getIndexHelper', () => indexHelper);

      server.route({
        method: 'GET',
        path: '/clearCache',
        handler: function (req, reply) {
          queryEngineHandler(server, 'clearCache', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path: '/getQueriesHtml',
        handler: function (req, reply) {
          queryEngineHandler(server, 'getQueriesHtml', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path: '/getQueriesData',
        handler: function (req, reply) {
          queryEngineHandler(server, 'getQueriesData', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path: '/getIdsFromQueries',
        handler: function (req, reply) {
          queryEngineHandler(server, 'getIdsFromQueries', req, reply);
        }
      });

      server.route({
        method: 'POST',
        path: '/gremlin',
        handler: function (req, reply) {
          queryEngine._getDatasourceFromEs(req.payload.params.datasourceId)
            .then((datasource) => {
              const config = server.config();
              const params = JSON.parse(datasource.datasourceParams);
              params.credentials = null;
              if (config.has('xpack.security.cookieName')) {
                const { username, password } = req.state[config.get('xpack.security.cookieName')];
                params.credentials = { username, password };
              }
              if (req.auth && req.auth.credentials && req.auth.credentials.proxyCredentials) {
                params.credentials = req.auth.credentials.proxyCredentials;
              }
              return queryEngine.gremlin(params, req.payload.params.options);
            })
            .then(reply)
            .catch(errors.StatusCodeError, function (err) {
              reply(Boom.create(err.statusCode, err.error.message || err.message, err.error.stack));
            })
            .catch(errors.RequestError, function (err) {
              if (err.error.code === 'ETIMEDOUT') {
                reply(Boom.create(408, err.message, ''));
              } else if (err.error.code === 'ECONNREFUSED') {
                reply({ error: `Could not send request to Gremlin server, please check if it is running. Details: ${err.message}` });
              } else {
                reply({ error: `An error occurred while sending a gremlin query: ${err.message}` });
              }
            });
        }
      });

      /*
       * Handles query to the ontology schema backend (in the gremlin server).
       */
      server.route({
        method: 'POST',
        path: '/schema',
        handler: function (req, reply) {
          const config = server.config();
          const opts = {
            method: req.payload.method ? req.payload.method : 'POST',
            data: req.payload.data,
            url: config.get('kibi_core.gremlin_server.url')
          };
          queryEngine.schema(req.payload.path, opts)
            .then(reply)
            .catch(errors.StatusCodeError, function (err) {
              reply(Boom.create(err.statusCode, err.error.message || err.message, err.error.stack));
            })
            .catch(errors.RequestError, function (err) {
              if (err.error.code === 'ETIMEDOUT') {
                reply(Boom.create(408, err.message, ''));
              } else if (err.error.code === 'ECONNREFUSED') {
                reply({ error: `Could not send request to Gremlin server, please check if it is running. Details: ${err.message}` });
              } else {
                reply({ error: `An error occurred while sending a schema query: ${err.message}` });
              }
            });
        }
      });
      /*
       * Translate a query containing kibi-specific DSL into an Elasticsearch query
       */
      server.route({
        method: 'POST',
        path: '/translateToES',
        handler: function (req, reply) {
          const serverConfig = server.config();
          // kibi: if query is a JSON, parse it to string
          let query;
          if (req.payload.query) {
            if (typeof req.payload.query !== 'object') {
              return reply(Boom.wrap(new Error('Expected query to be a JSON object containing single query', 400)));
            }
            query = JSON.stringify(req.payload.query);
          } else if (req.payload.bulkQuery) {
            if (!isString(req.payload.bulkQuery)) {
              return reply(Boom.wrap(new Error('Expected bulkQuery to be a String containing a bulk elasticsearch query', 400)));
            }
            query = req.payload.bulkQuery;
          }
          server.plugins.elasticsearch.getQueriesAsPromise(new buffer.Buffer(query))
            .map((query) => {
              // Remove the custom queries from the body
              server.plugins.elasticsearch.inject.save(query);
              return query;
            }).map((query) => {
              let credentials = null;
              if (serverConfig.has('xpack.security.cookieName')) {
                credentials = req.state[serverConfig.get('xpack.security.cookieName')];
              }
              if (req.auth && req.auth.credentials && req.auth.credentials.proxyCredentials) {
                credentials = req.auth.credentials.proxyCredentials;
              }
              return server.plugins.elasticsearch.dbfilter(server.plugins.query_engine.getQueryEngine(), query, credentials);
            }).map((query) => server.plugins.elasticsearch.sirenJoinSet(query))
            .map((query) => server.plugins.elasticsearch.sirenJoinSequence(query))
            .then((data) => {
              reply({ translatedQuery: data[0] });
            }).catch((err) => {
              let errStr;
              if (typeof err === 'object' && err.stack) {
                errStr = err.toString();
              } else {
                errStr = JSON.stringify(err, null, ' ');
              }
              reply(Boom.wrap(new Error(errStr, 400)));
            });
        }
      });
      server.route({
        method: 'POST',
        path: '/gremlin/ping',
        handler: function (req, reply) {
          queryEngine.gremlinPing(req.payload.url)
            .then(reply)
            .catch(errors.StatusCodeError, function (err) {
              reply(Boom.create(err.statusCode, err.error.message || err.message, err.error.stack));
            })
            .catch(errors.RequestError, function (err) {
              if (err.error.code === 'ETIMEDOUT') {
                reply(Boom.create(408, err.message, ''));
              } else if (err.error.code === 'ECONNREFUSED') {
                reply({ error: `Could not send request to Gremlin server, please check if it is running. Details: ${err.message}` });
              } else {
                reply({ error: `An error occurred while sending a gremlin ping: ${err.message}` });
              }
            });
        }
      });
    }
  });
};
