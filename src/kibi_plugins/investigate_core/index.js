import http from 'http';
import path from 'path';

import { name } from './package.json';

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
import migration16 from './lib/migrations/migration_16';
import migration17 from './lib/migrations/migration_17';
import migration18 from './lib/migrations/migration_18';
import migration19 from './lib/migrations/migration_19';
import migration20 from './lib/migrations/migration_20';

/**
 * The Kibi core plugin.
 *
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
    migration15,
    migration16,
    migration17,
    migration18,
    migration19,
    migration20
  ];

  return new kibana.Plugin({
    require: [ 'kibana' ],

    id: name,

    uiExports: {
      hacks: [
        'plugins/investigate_core/restore',
        'plugins/investigate_core/ui/directives/dashboards_nav/dashboards_nav',
        'plugins/investigate_core/ui/chrome/services/dashboards_nav_state',
        'plugins/investigate_core/saved_objects/dashboard_groups/saved_dashboard_groups',
        'plugins/investigate_core/ui/services/dashboard_groups',
        'plugins/investigate_core/ui/directives/dashboard_button/dashboard_button',
        'plugins/investigate_core/api/api'
      ],
      managementSections: [
        'plugins/investigate_core/management/sections/kibi_virtual_indices',
        'plugins/investigate_core/management/sections/kibi_datasources',
        'plugins/investigate_core/management/sections/kibi_entities',
        'plugins/investigate_core/management/sections/kibi_queries',
        'plugins/investigate_core/management/sections/kibi_templates'
      ],
      navbarExtensions: [
        'plugins/investigate_core/management/sections/navbar',
        'plugins/investigate_core/dashboard/navbar'
      ],
      spyModes: [
        'plugins/investigate_core/ui/spy_modes/multi_search_spy_mode'
      ],
      injectDefaultVars: function (server, options) {
        const vars = {};

        // Where: options = investigate_core piece of configuration
        if (options) {
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
          path: Joi.string().default('gremlin_server/gremlin-server.jar'),
          url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://127.0.0.1:8061'),
          ssl: Joi.object({
            key_store: Joi.string(),
            key_store_password: Joi.string(),
            ca: Joi.string()
          }).default()
        }).default(),

        datasource_encryption_algorithm: Joi.string().default('AES-GCM'),
        datasource_encryption_key: Joi.string().default('iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14='),

        datasource_cache_size: Joi.number().default(500),

        // kibi: it is left for logging deprecated message in init function
        default_dashboard_title: Joi.string().allow('').default('')
      }).default();
    },

    init: function (server, options) {
      const config = server.config();

      patchElasticsearchClient(server);

      if (config.get('investigate_core.default_dashboard_title') !== '') {
        server.log(['warning','investigate_core'], 'investigate_core.default_dashboard_title is deprecated ' +
        'and was moved to advance settings and should be removed from investigate.yml');
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
          // here we use admin cluster to make sure the _cat/plugins
          // will work even if it is a tribe cluster
          const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
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
          // here we use admin cluster to make sure the _cat/plugins
          // will work even if it is a tribe cluster
          const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');

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
