const http = require('http');
const path = require('path');
const Boom = require('boom');
const errors = require('request-promise/errors');

module.exports = function (kibana) {

  var datasourcesSchema = require('./lib/datasources_schema');
  var QueryEngine = require('./lib/query_engine');
  var queryEngine;

  var _validateQueryDefs = function (queryDefs) {
    if (queryDefs && queryDefs instanceof Array) {
      return true;
    }
    return false;
  };

  var handler = function (server, method, req, reply) {
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

    var config = server.config();
    if (config.has('shield.cookieName')) {
      options.credentials = req.state[config.get('shield.cookieName')];
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
        err = Boom.badRequest('Failed to execute query on an external datasource', error);
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
          transport_client: Joi.object({
            username: Joi.string().default(''),
            password: Joi.string().default('')
          })
        }),
        gremlin_server: Joi.object({
          path: Joi.string().allow('').default(''),
          url: Joi.string().default('http://127.0.0.1:8080'),
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

        default_dashboard_id: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();
      var datasourceCacheSize   = config.get('kibi_core.datasource_cache_size');

      this.status.yellow('Initialising the query engine');
      queryEngine = new QueryEngine(server);
      queryEngine._init(datasourceCacheSize).then((data) => {
        server.log(['info','kibi_core'], data);
        this.status.green('Query engine initialized');
      }).catch((err) => {
        server.log(['error','kibi_core'], err);
        this.status.red('Query engine initializiation failed');
      });

      // expose the queryengine to the other Hapi plugins
      server.expose('getQueryEngine', () => queryEngine);

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
            path: path.normalize(__dirname + '../../../../installedPlugins/')
          }
        }
      });
    }
  });

};
