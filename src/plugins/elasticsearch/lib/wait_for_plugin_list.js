var _ = require('lodash');

module.exports = function (plugin, server) {
  var config = server.config();
  var client = server.plugins.elasticsearch.client;

  return Promise.all(
    [
      client.cat.nodes({h: 'name,node.role,ip', format:'json'}),
      client.cat.plugins({h: 'name,component', format: 'json'})
    ]
  ).then((results) => {
    let elasticsearchPlugins = [];

    if (results && results[0] && results[1]) {
      let nodeList = results[0];
      // each element of nodeList contains:
      // name - node name
      // node.role - type of node: d for data nodes
      // ip - node ip address

      let pluginList = results[1];
      // each element of pluginList contains:
      // name - node name
      // component - plugin name

      let detectedSirenJoin = false;

      // 1 first gather list of all plugins
      _.each(pluginList, function (pluginEntry) {
        if (elasticsearchPlugins.indexOf(pluginEntry.component) === -1) {
          elasticsearchPlugins.push(pluginEntry.component);
        }
        if (pluginEntry.component === 'siren-join') {
          detectedSirenJoin = true;
        }
      });

      config.set('elasticsearch.plugins', elasticsearchPlugins);

      // 2 if siren-join detected verify that it is installed on all data nodes
      if (detectedSirenJoin) {
        _.each(nodeList, function (nodeEntry) {
          var nodeName = nodeEntry.name;
          var nodeRole = nodeEntry['node.role'];
          var nodeIp = nodeEntry.ip;
          // we only check that siren-join is installed on data nodes
          if (nodeRole === 'd') {
            var foundCorrespondingNode = false;
            _.each(pluginList, function (pluginEntry) {
              var nName = pluginEntry.name;
              var pName = pluginEntry.component;
              if (pName === 'siren-join' && nName === nodeName) {
                foundCorrespondingNode = true;
                return false;
              }
            });
            if (!foundCorrespondingNode) {
              plugin.status.red(
                'SIREn Join plugin is missing at node [' + nodeIp + ']\n' +
                'SIREn Join plugin should be installed on all data nodes.'
              );
            }
          }
        });
      }
    }

    return elasticsearchPlugins;
  }).catch(server.log);
};
