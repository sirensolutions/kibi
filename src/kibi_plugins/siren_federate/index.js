import pluginList from '../../core_plugins/elasticsearch/lib/wait_for_plugin_list.js';
import { find } from 'lodash';
import { isVanguardVersionGreaterOrEqual } from './lib/is_vanguard_version_greater_or_equal';

/**
 * The siren_federate plugin checks if there is Siren Federate plugin in Elasticsearch.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],
    id: 'siren_federate',

    init: function (server, options) {
      const callWithInternalUser = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;

      this.status.yellow('Checking for Siren Federate Elasticsearch plugin.');

      const checkSirenFederate = () => {

        pluginList(this, server)
        .then((plugins)=> {
          const vanguard = find(plugins, (p) => {
            return p.component === 'siren-vanguard';
          });
          if (vanguard) {
            // Check if it is the minimum version of Siren Federate
            callWithInternalUser('cat.nodes', { h: 'version', format:'json' })
            .then((nodeList) => {
              let elasticsearchVersion;
              for (let i = 0; i < nodeList.length; i++) {
                elasticsearchVersion = nodeList[i].version;
                break;
              }
              // for this 2 versions we check because only in -1 releases Vanguard does support "limit" parameter
              if (elasticsearchVersion === '5.4.3') {
                if (isVanguardVersionGreaterOrEqual(vanguard.version, '5.4.3-1')) {
                  this.status.green('Siren Federate plugin is found.');
                  return;
                } else {
                  this.status.red('Siren Federate plugin version too low. Upgrade to version >= 5.4.3-1');
                  return;
                }
              }
              if (elasticsearchVersion === '5.5.2') {
                if (isVanguardVersionGreaterOrEqual(vanguard.version, '5.5.2-1')) {
                  this.status.green('Siren Federate plugin is found.');
                  return;
                } else {
                  this.status.red('Siren Federate plugin version too low. Upgrade to version >= 5.5.2-1');
                  return;
                }
              }
              this.status.green('Siren Federate plugin is found.');
            });
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
