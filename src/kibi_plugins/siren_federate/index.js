import pluginList from '../../core_plugins/elasticsearch/lib/wait_for_plugin_list.js';

/**
 * The siren_federate plugin checks if there is Siren Federate plugin in Elasticsearch.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],
    id: 'siren_federate',

    init: function (server, options) {
      this.status.yellow('Checking for Siren Federate Elasticsearch plugin.');

      const checkSirenFederate = () => {

        pluginList(this, server)
        .then((plugins)=> {
          if (plugins.indexOf('siren-vanguard') !== -1) {
            this.status.green('Siren Federate plugin is found.');
          } else {
            this.status.red('Siren Federate plugin is not found. Please install it and restart Elasticsearch.');
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
