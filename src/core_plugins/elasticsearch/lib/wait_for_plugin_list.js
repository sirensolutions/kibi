import _ from 'lodash';

module.exports = function (plugin, server) {
  const config = server.config();
  const callWithInternalUser = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;

  return Promise.all(
    [
      callWithInternalUser('cat.nodes', { h: 'name,node.role,ip', format:'json' }),
      callWithInternalUser('cat.plugins', { h: 'name,component', format: 'json' })
    ]
  ).then(([ nodeList, pluginList ]) => {
    const elasticsearchPlugins = [];

    if (nodeList && pluginList) {
      // each element of nodeList contains:
      // name - node name
      // node.role - type of node: d for data nodes
      // ip - node ip address
      // each element of pluginList contains:
      // name - node name
      // component - plugin name

      let detectedSirenJoin = false;

      // 1 first gather list of all plugins
      _.each(pluginList, function (pluginEntry) {
        if (elasticsearchPlugins.indexOf(pluginEntry.component) === -1) {
          elasticsearchPlugins.push(pluginEntry.component);
        }
        if (pluginEntry.component === 'siren-platform') {
          detectedSirenJoin = true;
        }
      });

      config.set('elasticsearch.plugins', elasticsearchPlugins);

      // 2 if siren-platform detected verify that it is installed on all data nodes
      if (detectedSirenJoin) {
        _.each(nodeList, function (nodeEntry) {
          const nodeName = nodeEntry.name;
          const nodeRole = nodeEntry['node.role'];
          const nodeIp = nodeEntry.ip;
          // we only check that siren-platform is installed on data nodes
          if (nodeRole === 'd') {
            let foundCorrespondingNode = false;
            _.each(pluginList, function (pluginEntry) {
              const nName = pluginEntry.name;
              const pName = pluginEntry.component;
              if (pName === 'siren-platform' && nName === nodeName) {
                foundCorrespondingNode = true;
                return false;
              }
            });
            if (!foundCorrespondingNode) {
              plugin.status.red(
                'Siren Platform plugin is missing at data node:[' + nodeName + '] ip:[' + nodeIp + ']\n' +
                'Siren Platform plugin should be installed on all data nodes.'
              );
            }
          }
        });
      }
    }

    return elasticsearchPlugins;
  })
  .catch(err => {
    config.set('elasticsearch.plugins', []);
    plugin.status.yellow(err);
  });
};
