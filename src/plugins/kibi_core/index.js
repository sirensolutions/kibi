var http = require('http');
var path = require('path');

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

    queryEngine[method](queryDefs, options)
    .then(function (queries) {
      return reply({
        query: params,
        snippets: queries
      });

    }).catch(function (error) {
      var message;
      if (error.message) {
        message = error.message;
      } else {
        message = JSON.stringify(error, null, ' ');
      }

      return reply({
        query: params,
        error: message
      });
    });
  };

  return new kibana.Plugin({
    // During the enterprise build this line has to be swapped, to add the 'kibi_graph_browser_vis' requirement
    require: ['kibana'],

    id: 'kibi_core',

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),

        load_jdbc: Joi.boolean().default(false),

        enterprise_enabled: Joi.boolean().default(false),

        es_cluster_name: Joi.string().default('elasticsearch'),
        es_transport_port: Joi.number().default(9330),

        datasource_encryption_algorithm: Joi.string().default('AES-GCM'),
        datasource_encryption_key: Joi.string().default('iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14='),

        datasources_schema: Joi.any().default(datasourcesSchema),

        datasource_enable_cache: Joi.boolean().default(true),
        datasource_cache_size: Joi.number().default(500),
        datasource_cache_max_age: Joi.number().default(3600),

        default_dashboard_id: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();
      var datasourceEnableCache = config.get('kibi_core.datasource_enable_cache');
      var datasourceCacheSize   = config.get('kibi_core.datasource_cache_size');
      var datasourceCacheMaxAge = config.get('kibi_core.datasource_cache_max_age');

      this.status.yellow('Initialising the query engine');
      queryEngine = new QueryEngine(server);
      queryEngine._init(
          datasourceEnableCache,
          datasourceCacheSize,
          datasourceCacheMaxAge
      ).then((data) => {
        this.status.green('Query engine initialized');
        server.log(['info','kibi_core'], data);
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

      server.route({
        method: ['GET', 'POST'],
        path: '/datasource/{id}/proxy/',
        handler: {
          proxy: {
            mapUri: function (req, callback) {
              queryEngine._getDatasourceFromEs(req.params.id).then(function (datasource) {
                if (datasource === null) {
                  callback(new Error('Datasource not found'));
                }
                if (datasource.datasourceType === 'tinkerpop3') {
                  callback(null, JSON.parse(datasource.datasourceParams).url);
                } else {
                  callback(new Error('Proxy not available for the specified datasource'));
                }
              });
            },
            passThrough: true,
            agent: new http.Agent(),
            xforward: true
          }
        }
      });
    }
  });

};
