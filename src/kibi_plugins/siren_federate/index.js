import pluginList from '../../core_plugins/elasticsearch/lib/wait_for_plugin_list.js';
import { contains } from 'lodash';
/**
 * The federate plugin checks if there is siren federate plugin in elasticsearch.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],
    id: 'siren_federate',

    init: function (server, options) {
      this.status.yellow('Checking for Siren Federate.');

      const checkSirenFederate = () => {

        pluginList(this, server)
        .then((plugins)=> {
          if (contains(plugins, 'siren-vanguard')) {
            this.status.green('Siren Federate is found.');
          } else {
            this.status.red('Siren Federate is not found in Elasticsearch plugins. Please install and restart Elasticsearch.');
          }
        });
      };

      const status = server.plugins.elasticsearch.status;
      if (status && status.state === 'green') {
        checkSirenFederate();
      } else {
        status.on('change', () => {
          if (server.plugins.elasticsearch.status.state === 'green') {
            checkSirenFederate();
          }
        });
      }
    }

  });

};
