import _ from 'lodash';
import http from 'http';
import path from 'path';
import Boom from 'boom';
import errors from 'request-promise/errors';

import cryptoHelper from './lib/crypto_helper';
import datasourcesSchema from './lib/datasources_schema';
import QueryEngine from './lib/query_engine';
import IndexHelper from './lib/index_helper';
import { patchElasticsearchClient } from './lib/elasticsearch/patch_elasticsearch_client';

import migration1 from './lib/migrations/migration_1';
import migration2 from './lib/migrations/migration_2';
import migration3 from './lib/migrations/migration_3';
import migration4 from './lib/migrations/migration_4';
import migration5 from './lib/migrations/migration_5';
import migration6 from './lib/migrations/migration_6';
import migration7 from './lib/migrations/migration_7';
import migration8 from './lib/migrations/migration_8';
import migration9 from './lib/migrations/migration_9';
import migration10 from './lib/migrations/migration_10';
import migration11 from './lib/migrations/migration_11';
import migration12 from './lib/migrations/migration_12';
import migration13 from './lib/migrations/migration_13';

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
    migration5,
    migration6,
    migration7,
    migration8,
    migration9,
    migration10,
    migration11,
    migration12,
    migration13
  ];

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
    if (config.has('xpack.security.cookieName')) {
      options.credentials = req.state[config.get('xpack.security.cookieName')];
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
        'plugins/kibi_core/restore',
        'plugins/kibi_core/ui/directives/dashboards_nav/dashboards_nav',
        'plugins/kibi_core/ui/chrome/services/dashboards_nav_state',
        'plugins/kibi_core/saved_objects/dashboard_groups/saved_dashboard_groups',
        'plugins/kibi_core/ui/services/dashboard_groups',
        'plugins/kibi_core/ui/directives/dashboard_button/dashboard_button',
        'plugins/kibi_core/api/api'
      ],
      managementSections: [
        'plugins/kibi_core/management/sections/kibi_datasources',
        'plugins/kibi_core/management/sections/kibi_queries',
        'plugins/kibi_core/management/sections/kibi_relations',
        'plugins/kibi_core/management/sections/kibi_templates'
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

        // kibi_core options
        if (options) {
          vars.kibiDatasourcesSchema = options.datasources_schema;
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
        clusterplugins: Joi.any(),

        enterprise_enabled: Joi.boolean().default(false),
        elasticsearch: Joi.object({
          auth_plugin: Joi.string().allow('').default('')
        }),
        gremlin_server: Joi.object({
          log_conf_path: Joi.string().allow('').default(''),
          debug_remote: Joi.string().allow('').default(''),
          path: Joi.string().allow('').default(''),
          url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://127.0.0.1:8080'),
          ssl: Joi.object({
            key_store: Joi.string(),
            key_store_password: Joi.string(),
            ca: Joi.string()
          })
        }),

        datasource_encryption_algorithm: Joi.string().default('AES-GCM'),
        datasource_encryption_key: Joi.string().default('iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14='),

        datasources_schema: Joi.any().default(datasourcesSchema.toInjectedVar()),
        datasource_cache_size: Joi.number().default(500),

        // kibi: it is left for logging deprecated message in init function
        default_dashboard_title: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();
      const datasourceCacheSize   = config.get('kibi_core.datasource_cache_size');

      patchElasticsearchClient(server);

      if (config.get('kibi_core.default_dashboard_title') !== '') {
        server.log(['warning','kibi_core'], 'kibi_core.default_dashboard_title is deprecated ' +
        'and was moved to advance settings and should be removed from kibi.yml');
      }

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
          queryEngineHandler(server, 'clearCache', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path:'/getQueriesHtml',
        handler: function (req, reply) {
          queryEngineHandler(server, 'getQueriesHtml', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path:'/getQueriesData',
        handler: function (req, reply) {
          queryEngineHandler(server, 'getQueriesData', req, reply);
        }
      });

      server.route({
        method: 'GET',
        path:'/getIdsFromQueries',
        handler: function (req, reply) {
          queryEngineHandler(server, 'getIdsFromQueries', req, reply);
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
            let credentials = null;
            if (serverConfig.has('xpack.security.cookieName')) {
              credentials = req.state[serverConfig.get('xpack.security.cookieName')];
            }
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
            } else if (err.error.code === 'ECONNREFUSED') {
              reply({ error: `Could not send request to Gremlin server, please check if it is running. Details: ${err.message}` });
            } else {
              reply({ error: `An error occurred while sending a gremlin ping: ${err.message}` });
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

      // Adding a route to return the list of installed Elasticsearch plugins
      server.route({
        method: 'GET',
        path:'/getElasticsearchPlugins',
        handler: function (request, reply) {
          const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('data');

          return callWithInternalUser('cat.plugins', {
            h: 'component',
            format: 'json'
          })
          .then(components => reply(_.pluck(components, 'component')));
        }
      });
    }

  });

};
