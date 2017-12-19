import http from 'http';
import path from 'path';

import { patchElasticsearchClient } from './lib/elasticsearch/patch_elasticsearch_client';

import migration1 from './lib/migrations/migration_1';
import migration2 from './lib/migrations/migration_2';
import migration3 from './lib/migrations/migration_3';
import migration4 from './lib/migrations/migration_4';
import migration5 from './lib/migrations/migration_5';
// migration 6 removed as no longer needed as we added a build-in model of url object to savedObjectsAPI
import migration7 from './lib/migrations/migration_7';
import migration8 from './lib/migrations/migration_8';
import migration9 from './lib/migrations/migration_9';
import migration10 from './lib/migrations/migration_10';
import migration11 from './lib/migrations/migration_11';
import migration12 from './lib/migrations/migration_12';
import migration13 from './lib/migrations/migration_13';
import migration14 from './lib/migrations/migration_14';
import migration15 from './lib/migrations/migration_15';

/**
 * The Kibi core plugin.
 *
 * The plugin exposes the following methods to other hapi plugins:
 *
 * - getQueryEngine: returns an instance of QueryEngine.
 * - getIndexHelper: returns an instance of IndexHelper.
 */
module.exports = function (kibana) {


  const migrations = [
    migration1,
    migration2,
    migration3,
    migration4,
    migration5,
    migration7,
    migration8,
    migration9,
    migration10,
    migration11,
    migration12,
    migration13,
    migration14,
    migration15
  ];

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
        'plugins/kibi_core/management/sections/kibi_virtual_indices',
        'plugins/kibi_core/management/sections/kibi_datasources',
        'plugins/kibi_core/management/sections/kibi_entities',
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

        // kibi: datasources_schema is not used anywhere but can be brought back to life later if we descide to use this
        // datasources_schema: Joi.any().default(datasourcesSchema.toInjectedVar()),
        datasource_cache_size: Joi.number().default(500),

        // kibi: it is left for logging deprecated message in init function
        default_dashboard_title: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();

      patchElasticsearchClient(server);

      if (config.get('kibi_core.default_dashboard_title') !== '') {
        server.log(['warning','kibi_core'], 'kibi_core.default_dashboard_title is deprecated ' +
        'and was moved to advance settings and should be removed from kibi.yml');
      }

      // Expose the migrations
      server.expose('getMigrations', () => migrations);

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
      // Route takes an optional parameter of the string "version"
      // If "version" is present, the plugins are returned as an array of objects
      // containing 'component' (plugin name) and 'version'
      // If version is absent, an array of the plugin names are returned
      server.route({
        method: 'GET',
        path:'/getElasticsearchPlugins/{version?}',
        handler: function (request, reply) {
          const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('data');
          const h = `component${request.params.version && request.params.version === 'versions' ? ',version' : ''}`;
          return callWithInternalUser('cat.plugins', {
            h,
            format: 'json'
          })
          .then(components => {
            if (!(request.params.version && request.params.version === 'versions')) {
              components = components.map(component => component.component);
            }

            return reply(components);
          });
        }
      });

      server.route({
        method: 'GET',
        path:'/elasticsearchVersion',
        handler: function (request, reply) {
          const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('data');

          return callWithInternalUser('nodes.info', {
            filterPath: [
              'nodes.*.version'
            ]
          })
          .then(info => {
            const versions = Object.keys(info.nodes)
              .map(nodeKey => info.nodes[nodeKey].version);

            return reply(versions);
          });
        }
      });
    }

  });

};
