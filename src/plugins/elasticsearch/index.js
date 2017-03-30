import { trim, trimRight } from 'lodash';
import { methodNotAllowed } from 'boom';

import healthCheck from './lib/health_check';
import exposeClient from './lib/expose_client';
import createKibanaProxy, { createPath } from './lib/create_kibana_proxy';
import createKibiProxy from './lib/create_kibi_proxy';

module.exports = function ({ Plugin }) {
  return new Plugin({
    require: ['kibana'],

    config(Joi) {
      const { array, boolean, number, object, string } = Joi;

      return object({
        enabled: boolean().default(true),
        url: string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
        preserveHost: boolean().default(true),
        username: string(),
        password: string(),
        shardTimeout: number().default(0),
        requestTimeout: number().default(300000),
        customHeaders: object().default({}),
        pingTimeout: number().default(30000),
        startupTimeout: number().default(5000),
        ssl: object({
          verify: boolean().default(true),
          ca: array().single().items(string()),
          cert: string(),
          key: string()
        }).default(),
        apiVersion: string().default('2.0'),
        engineVersion: string().valid('^2.4.0').default('^2.4.0'),
        plugins: Joi.array().default([])
      }).default();
    },

    uiExports: {
      injectDefaultVars(server, options) {
        return {
          esRequestTimeout: options.requestTimeout,
          esShardTimeout: options.shardTimeout,
          esApiVersion: options.apiVersion,
        };
      }
    },

    init(server, options) {
      const kibanaIndex = server.config().get('kibana.index');

      // kibi: register our proxy implementation so that the request can be modified
      server.register(require('kibi-h2o2'), (err) => {
        if (err) {
          server.log('Failed to load kibi h2o2');
        }
      });
      // kibi: end

      // Expose the client to the server
      exposeClient(server);

      // kibi: expose transformations
      const transforms = require('./lib/transforms')(server);
      server.expose('transformSearchRequest', transforms.transformSearchRequest);
      server.expose('transformSearchResponse', transforms.transformSearchResponse);
      // kibi: end

      createKibiProxy(server, 'GET', '/{paths*}');
      createKibiProxy(server, 'POST', '/_mget');
      createKibiProxy(server, 'POST', '/_search');
      createKibiProxy(server, 'POST', '/{index}/_search');
      createKibiProxy(server, 'POST', '/{index}/{type}/_search'); // siren: for some searches we specify the index type
      createKibiProxy(server, 'POST', '/{index}/_field_stats');
      createKibiProxy(server, 'POST', '/_msearch');
      createKibanaProxy(server, 'POST', '/_search/scroll');

      function noBulkCheck({ path }, reply) {
        if (/\/_bulk/.test(path)) {
          return reply({
            error: 'You can not send _bulk requests to this interface.'
          }).code(400).takeover();
        }
        return reply.continue();
      }

      function noDirectIndex({ path }, reply) {
        const requestPath = trimRight(trim(path), '/');
        const matchPath = createPath(kibanaIndex);

        if (requestPath === matchPath) {
          return reply(methodNotAllowed('You cannot modify the primary kibana index through this interface.'));
        }

        reply.continue();
      }

      // These routes are actually used to deal with things such as managing
      // index patterns and advanced settings, but since hapi treats route
      // wildcards as zero-or-more, the routes also match the kibana index
      // itself. The client-side kibana code does not deal with creating nor
      // destroying the kibana index, so we limit that ability here.
      createKibiProxy(
        server,
        ['PUT', 'POST', 'DELETE'],
        `/${kibanaIndex}/{paths*}`,
        {
          pre: [ noDirectIndex, noBulkCheck ]
        }
      );

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(this, server);
      server.expose('waitUntilReady', waitUntilReady);
      start();
    }
  });

};
