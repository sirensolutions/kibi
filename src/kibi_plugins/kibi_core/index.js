import _ from 'lodash';
import http from 'http';
import path from 'path';
import Boom from 'boom';
import errors from 'request-promise/errors';

import cryptoHelper from './lib/crypto_helper';
import datasourcesSchema from './lib/datasources_schema';
import QueryEngine from './lib/query_engine';
import IndexHelper from './lib/index_helper';

import migration1 from './lib/migrations/migration_1';
import migration2 from './lib/migrations/migration_2';
import migration3 from './lib/migrations/migration_3';
import migration4 from './lib/migrations/migration_4';
import migration5 from './lib/migrations/migration_5';

/**
 * The Kibi core plugin.
 *
 * The plugin exposes the following methods to other hapi plugins:
 *
 * - getQueryEngine: returns an instance of QueryEngine.
 * - getIndexHelper: returns an instance of IndexHelper.
 */
module.exports = function (kibana) {

  let queryEngine;
  let indexHelper;

  const migrations = [
    migration1,
    migration2,
    migration3,
    migration4,
    migration5
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
    require: [ 'kibana' ],

    id: 'kibi_core',

    uiExports: {
      hacks: [
        'plugins/kibi_core/ui/directives/dashboards_nav/dashboards_nav',
        'plugins/kibi_core/ui/chrome/services/dashboards_nav_state',
        'plugins/kibi_core/ui/services/dashboard_groups'
      ],
      managementSections: [
        'plugins/kibi_core/management/sections/kibi_dashboard_groups',
        'plugins/kibi_core/management/sections/kibi_datasources',
        'plugins/kibi_core/management/sections/kibi_queries',
        'plugins/kibi_core/management/sections/kibi_relations',
        'plugins/kibi_core/management/sections/kibi_templates',
        'plugins/kibi_core/management/sections/sessions'
      ],
      navbarExtensions: [
        'plugins/kibi_core/management/sections/navbar',
        'plugins/kibi_core/dashboard/navbar'
      ],
      spyModes: [
        'plugins/kibi_core/ui/spy_modes/multi_search_spy_mode'
      ],
      injectDefaultVars: function (server, options) {
        const vars = {};

        if (options) {
          vars.kibiDatasourcesSchema = options.datasources_schema;
          vars.kibiDefaultDashboardTitle = options.default_dashboard_title;
          vars.kibiWarnings = {};
          if (options.datasource_encryption_key === 'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=') {
            vars.kibiWarnings.datasource_encryption_warning = true;
          }
        }

        return vars;
      }
    },

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

        datasources_schema: Joi.any().default(datasourcesSchema.toInjectedVar()),
        datasource_cache_size: Joi.number().default(500),

        default_dashboard_title: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();
      const datasourceCacheSize   = config.get('kibi_core.datasource_cache_size');

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
            } else {
              reply({ error: 'An error occurred while sending a gremlin query: ' + JSON.stringify(err) });
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
          server.plugins.elasticsearch.getQueriesAsPromise(req.payload.query)
          .map((query) => {
            // Remove the custom queries from the body
            server.plugins.elasticsearch.inject.save(query);
            return query;
          }).map((query) => {
            let credentials = serverConfig.has('shield.cookieName') ? req.state[serverConfig.get('shield.cookieName')] : null;
            if (req.auth && req.auth.credentials && req.auth.credentials.proxyCredentials) {
              credentials = req.auth.credentials.proxyCredentials;
            }
            return server.plugins.elasticsearch.dbfilter(server.plugins.kibi_core.getQueryEngine(), query, credentials);
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
            } else {
              reply({ error: 'An error occurred while sending a gremlin ping: ' + JSON.stringify(err) });
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
            path: path.normalize(__dirname + '../../../plugins/')
          }
        }
      });
    }

  });

};
