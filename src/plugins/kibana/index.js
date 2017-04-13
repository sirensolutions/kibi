module.exports = function (kibana) {
  return new kibana.Plugin({

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultAppId: Joi.string().default('discover'),
        index: Joi.string().default('.kibi') // kibi: renamed kibana to kibi
      }).default();
    },

    uiExports: {
      app: {
        title: 'Kibi',
        description: 'the kibana you know and love',
        //icon: 'plugins/kibana/settings/sections/about/barcode.svg',
        main: 'plugins/kibana/kibana',
        uses: [
          'visTypes',
          'spyModes',
          'navbarExtensions',
          'settingsSections',
          'objectActions', // kibi: allow to add object actions
          'hacks' // kibi: allow to insert our own version of some kibana components like the kibiee notifier
        ],

        autoload: kibana.autoload.require.concat(
          'ui/kibi/state_management/kibi_state', // kibi: added by kibi for our state
          'plugins/kibana/discover',
          'plugins/kibana/visualize',
          'plugins/kibana/dashboard',
          'plugins/kibana/settings',
          'plugins/kibana/doc',
          'ui/vislib',
          'ui/agg_response',
          'ui/agg_types',
          'leaflet'
        ),

        injectVars: function (server, options) {
          const config = server.config();

          const ret = {
            kbnDefaultAppId: config.get('kibana.defaultAppId'),
            tilemap: config.get('tilemap')
          };

          // kibi: list of elasticsearch plugins, schema, default_dashboard_title and warnings
          ret.elasticsearchPlugins = config.get('elasticsearch.plugins');
          if (config.has('kibi_core')) {
            ret.kibiDatasourcesSchema  = config.get('kibi_core.datasources_schema');
            ret.kibiDefaultDashboardTitle = config.get('kibi_core.default_dashboard_title');
            ret.kibiWarnings = {};
            if (config.get('kibi_core.datasource_encryption_key') === 'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=') {
              ret.kibiWarnings.datasource_encryption_warning = true;
            }
          }

          ret.kacConfiguration = {
            acl: {
              enabled: config.has('kibi_access_control.acl.enabled') ? config.get('kibi_access_control.acl.enabled') : false
            }
          };
          // kibi:end

          return ret;
        }
      },

      injectDefaultVars(server, options) {
        return {
          kbnIndex: options.index
        };
      },
    }
  });

};
