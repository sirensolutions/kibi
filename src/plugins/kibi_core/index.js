const _ = require('lodash');
const http = require('http');
const path = require('path');
const Boom = require('boom');
const errors = require('request-promise/errors');

const util = require('../elasticsearch/lib/util');

const dbfilter = require('../elasticsearch/lib/dbfilter');
const inject = require('../elasticsearch/lib/inject');

import cryptoHelper from './lib/crypto_helper';

/**
 * The Kibi core plugin.
 *
 * The plugin exposes the following methods to other hapi plugins:
 *
 * - getQueryEngine: returns an instance of QueryEngine.
 * - getIndexHelper: returns an instance of IndexHelper.
 */
module.exports = function (kibana) {

  const datasourcesSchema = require('./lib/datasources_schema');
  const QueryEngine = require('./lib/query_engine');
  const IndexHelper = require('./lib/index_helper');
  let queryEngine;
  let indexHelper;

  const migrations = [
    require('./lib/migrations/migration_1'),
    require('./lib/migrations/migration_2'),
    require('./lib/migrations/migration_3'),
    require('./lib/migrations/migration_4'),
    require('./lib/migrations/migration_5'),
    require('./lib/migrations/migration_6')
  ];

  const _validateQueryDefs = function (queryDefs) {
    if (queryDefs && queryDefs instanceof Array) {
      return true;
    }
    return false;
  };

  const handler = function (server, method, req, reply) {
    const params = req.query;
    let options = {};
    let queryDefs = [];

    if (params.options) {
      try {
        options = JSON.parse(params.options);
      } catch (e) {
        server.log(['error','kibi_core'], 'Could not parse options [' + params.options + '] for method [' + method + '].');
      }
    }

    if (params.queryDefs) {
      try {
        queryDefs = JSON.parse(params.queryDefs);
      } catch (e) {
        server.log(['error','kibi_core'], 'Could not parse queryDefs [' + params.queryDefs + '] for method [' + method + '].');
      }
    }

    if (_validateQueryDefs(queryDefs) === false) {
      return reply({
        query: '',
        error: 'queryDefs should be an Array of queryDef objects'
      });
    }

    const config = server.config();
    if (config.has('shield.cookieName')) {
      options.credentials = req.state[config.get('shield.cookieName')];
    }
    if (req.auth && req.auth.credentials && req.auth.credentials.proxyCredentials) {
      options.credentials = req.auth.credentials.proxyCredentials;
    }
    queryEngine[method](queryDefs, options)
    .then(function (queries) {
      return reply({
        query: params,
        snippets: queries
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
    require: ['kibana'],

    id: 'kibi_core',

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),

        load_jdbc: Joi.boolean().default(false),

        enterprise_enabled: Joi.boolean().default(false),
        elasticsearch: Joi.object({
          auth_plugin: Joi.string().allow('').default(''),
          transport_client: Joi.object({
            username: Joi.string().allow('').default(''),
            password: Joi.string().allow('').default(''),
            ssl: Joi.object({
              ca: Joi.string().allow('').default(''),
              ca_password: Joi.string().allow('').default(''),
              ca_alias: Joi.string().allow('').default(''),
              key_store: Joi.string().allow('').default(''),
              key_store_password: Joi.string().allow('').default(''),
              key_store_alias: Joi.string().allow('').default(''),
              verify_hostname: Joi.boolean().default(true),
              verify_hostname_resolve: Joi.boolean().default(false)
            })
          })
        }),
        gremlin_server: Joi.object({
          log_conf_path: Joi.string().allow('').default(''),
          debug_remote: Joi.string().allow('').default(''),
          path: Joi.string().allow('').default(''),
          url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://127.0.0.1:8080'),
          ssl: Joi.object({
            key_store: Joi.string().default(''),
            key_store_password: Joi.string().default(''),
            ca: Joi.string().allow('').default('')
          })
        }),

        datasource_encryption_algorithm: Joi.string().default('AES-GCM'),
        datasource_encryption_key: Joi.string().default('iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14='),

        datasources_schema: Joi.any().default(datasourcesSchema),
        datasource_cache_size: Joi.number().default(500),

        default_dashboard_title: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();
      const datasourceCacheSize   = config.get('kibi_core.datasource_cache_size');

      const filterJoinSet = require('../elasticsearch/lib/filter_join')(server).set;
      const filterJoinSequence = require('../elasticsearch/lib/filter_join')(server).sequence;

      this.status.yellow('Initialising the query engine');
      queryEngine = new QueryEngine(server);
      queryEngine._init(datasourceCacheSize).then((data) => {
        server.log(['info','kibi_core'], data);
        this.status.green('Query engine initialized');
      }).catch((err) => {
        server.log(['error','kibi_core'], err);
        this.status.red('Query engine initialization failed');
      });

      server.expose('getQueryEngine', () => queryEngine);

      server.expose('getCryptoHelper', () => cryptoHelper);

      indexHelper = new IndexHelper(server);
      server.expose('getIndexHelper', () => indexHelper);

      // Expose the migrations
      server.expose('getMigrations', () => migrations);

      server.route({
        method: 'GET',
        path:'/clearCache',
        handler: function (req, reply) {
          handler(server, 'clearCache', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path:'/getQueriesHtml',
        handler: function (req, reply) {
          handler(server, 'getQueriesHtml', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path:'/getQueriesData',
        handler: function (req, reply) {
          handler(server, 'getQueriesData', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path:'/getIdsFromQueries',
        handler: function (req, reply) {
          handler(server, 'getIdsFromQueries', req, reply);
        }
      });

      server.route({
        method: 'POST',
        path:'/gremlin',
        handler: function (req, reply) {
          queryEngine._getDatasourceFromEs(req.payload.params.datasourceId)
          .then((datasource) => {
            const config = server.config();
            const params = JSON.parse(datasource.datasourceParams);
            params.credentials = null;
            if (config.has('shield.cookieName')) {
              const { username, password } = req.state[config.get('shield.cookieName')];
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
              reply({ error: `Could not send request to Gremlin server, please check if it is running. Details: ${err.message}`});
            } else {
              reply({ error: `An error occurred while sending a gremlin query: ${err.message}`});
            }
          });
        }
      });

      /*
       * Translate a query containing kibi-specific DSL into an Elasticsearch query
       */
      server.route({
        method: 'POST',
        path:'/translateToES',
        handler: function (req, reply) {
          const serverConfig = server.config();
          util.getQueriesAsPromise(req.payload.query)
          .map((query) => {
            // Remove the custom queries from the body
            inject.save(query);
            return query;
          }).map((query) => {
            let credentials = serverConfig.has('shield.cookieName') ? req.state[serverConfig.get('shield.cookieName')] : null;
            if (req.auth && req.auth.credentials && req.auth.credentials.proxyCredentials) {
              credentials = req.auth.credentials.proxyCredentials;
            }
            return dbfilter(server.plugins.kibi_core.getQueryEngine(), query, credentials);
          }).map((query) => filterJoinSet(query))
          .map((query) => filterJoinSequence(query))
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
        path:'/gremlin/ping',
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
              reply({ error: `Could not send request to Gremlin server, please check if it is running. Details: ${err.message}`});
            } else {
              reply({ error: `An error occurred while sending a gremlin ping: ${err.message}`});
            }
          });
        }
      });

      // Adding a route to serve static content for enterprise modules.
      server.route({
        method: 'GET',
        path:'/static/{param*}',
        handler: {
          directory: {
            path: path.normalize(path.join(__dirname, '../../../installedPlugins/'))
          }
        }
      });
    }

  });

};
