module.exports = function (kibana) {
  var healthCheck = require('./lib/health_check');
  var exposeClient = require('./lib/expose_client');
  var createKibanaProxy = require('./lib/create_kibana_proxy');
  var createKibiProxy = require('./lib/create_kibi_proxy');

  return new kibana.Plugin({
    require: ['kibana'],

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
        preserveHost: Joi.boolean().default(true),
        username: Joi.string(),
        password: Joi.string(),
        shardTimeout: Joi.number().default(0),
        requestTimeout: Joi.number().default(30000),
        pingTimeout: Joi.number().default(30000),
        startupTimeout: Joi.number().default(5000),
        ssl: Joi.object({
          verify: Joi.boolean().default(true),
          ca: Joi.array().single().items(Joi.string()),
          cert: Joi.string(),
          key: Joi.string()
        }).default(),
        apiVersion: Joi.string().default('2.0'),
        engineVersion: Joi.string().valid('^2.2.0').default('^2.2.0'),
        plugins: Joi.array().default([])
      }).default();
    },

    init: function (server, options) {
      var config = server.config();

      // kibi: register our proxy implementation so that the request can be modified
      server.register(require('kibi-h2o2'), (err) => {
        if (err) {
          server.log('Failed to load kibi h2o2');
        }
      });
      // kibi: end

      // Expose the client to the server
      exposeClient(server);
      createKibiProxy(server, 'GET', '/{paths*}');
      createKibiProxy(server, 'POST', '/_mget');
      createKibiProxy(server, 'POST', '/{index}/_search');
      createKibiProxy(server, 'POST', '/{index}/{type}/_search');
      createKibiProxy(server, 'POST', '/{index}/_field_stats');
      createKibiProxy(server, 'POST', '/_msearch');
      createKibanaProxy(server, 'POST', '/_search/scroll');

      function noBulkCheck(request, reply) {
        if (/\/_bulk/.test(request.path)) {
          return reply({
            error: 'You can not send _bulk requests to this interface.'
          }).code(400).takeover();
        }
        return reply.continue();
      }

      createKibiProxy(
        server,
        ['PUT', 'POST', 'DELETE'],
        '/' + config.get('kibana.index') + '/{paths*}',
        {
          pre: [ noBulkCheck ]
        }
      );

      // Set up the health check service and start it.
      healthCheck(this, server).start();
    }
  });

};
