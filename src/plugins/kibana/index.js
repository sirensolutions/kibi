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
          'settingsSections',
          'hacks'
        ],

        autoload: kibana.autoload.require.concat(
          'plugins/kibana/discover',
          'plugins/kibana/visualize',
          'plugins/kibana/dashboard',
          'plugins/kibana/settings',
          'plugins/kibana/settings/sections',
          'plugins/kibana/doc',
          'ui/vislib',
          'ui/agg_response',
          'ui/agg_types',
          'leaflet'
        ),

        injectVars: function (server, options) {
          let config = server.config();

          var ret = {
            kbnDefaultAppId: config.get('kibana.defaultAppId')
          };

          // kibi: list of elasticsearch plugins, schema, default_dashboard_id and warnings
          ret.elasticsearchPlugins = config.get('elasticsearch.plugins');
          if (config.has('kibi_core')) {
            ret.kibiDatasourcesSchema  = config.get('kibi_core.datasources_schema');
            ret.kibiDefaultDashboardId = config.get('kibi_core.default_dashboard_id');
            ret.kibiWarnings = {};
            if (config.get('kibi_core.datasource_encryption_key') === 'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=') {
              ret.kibiWarnings.datasource_encryption_warning = true;
            }
          }
          // kibi:end

          return ret;
        }
      }
    }
  });

};
