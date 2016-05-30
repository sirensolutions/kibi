
module.exports = function (plugin, server) {
  var config = server.config();
  var client = server.plugins.elasticsearch.client;

  return Promise.all([ client.cat.nodes({'h': 'name,node.role,ip'}), client.cat.plugins({'h': 'component'}) ])
  .then((results) => {
    let elasticsearchPlugins = [];

    if (results && results[0] && results[1]) {
      const nodes = results[0].split('\n').filter((node) => !!node);
      const parts = results[0].split(' ');
      const typeNode = parts[1];
      const ipNode = parts[2];
      const pluginCounts = results[1].split('\n')
      .filter((plugin) => !!plugin)
      .map((plugin) => plugin.trim())
      .reduce((prev, curr, index, array) => {
        if (prev[curr]) {
          prev[curr] += 1;
        } else {
          prev[curr] = 1;
        }
        return prev;
      }, {});

      for (let pluginName in pluginCounts) {
        if (pluginCounts[pluginName] === nodes.length) {
          if (pluginName === 'siren-join' && typeNode !== 'd') {
            plugin.status.red('SIREn Join plugin should be installed on a data node only (node IP: ' + ipNode + ').');
          } else {
            elasticsearchPlugins.push(pluginName);
          }
        }
      }
    }
    config.set('elasticsearch.plugins', elasticsearchPlugins);
  }).catch(server.log);
};
