var _ = require('lodash');
var Promise = require('bluebird');
var elasticsearch = require('elasticsearch');
var exposeClient = require('./expose_client');
var migrateConfig = require('./migrate_config');
var createKibanaIndex = require('./create_kibana_index');
var checkEsVersion = require('./check_es_version');
var NoConnections = elasticsearch.errors.NoConnections;
var util = require('util');
var format = util.format;

module.exports = function (plugin, server) {
  var config = server.config();
  var client = server.plugins.elasticsearch.client;

  plugin.status.yellow('Waiting for Elasticsearch');

  function waitForPong() {
    return client.ping({ requestTimeout: 1500 }).catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;

      plugin.status.red(format('Unable to connect to Elasticsearch at %s.', config.get('elasticsearch.url')));

      return Promise.delay(2500).then(waitForPong);
    });
  }

  function waitForShards() {
    return client.cluster.health({
      timeout: '5s', // tells es to not sit around and wait forever
      index: config.get('kibana.index'),
      ignore: [408]
    })
    .then(function (resp) {
      // if "timed_out" === true then elasticsearch could not
      // find any idices matching our filter within 5 seconds
      if (!resp || resp.timed_out) {
        plugin.status.yellow('No existing Kibana index found');
        return createKibanaIndex(server);
      }

      // If status === "red" that means that index(es) were found
      // but the shards are not ready for queries
      if (resp.status === 'red') {
        plugin.status.red('Elasticsearch is still initializing the kibana index.');
        return Promise.delay(2500).then(waitForShards);
      }

      // otherwise we are g2g
      plugin.status.green('Kibana index ready');
    });
  }

  // Kibi: get the list of plugins
  function waitForPluginList() {
    return Promise.all([ client.cat.nodes({'h': 'name'}), client.cat.plugins({'h': 'component'}) ])
    .then((results) => {
      let elasticsearchPlugins = [];

      if (results && results[0] && results[1]) {
        const nodes = results[0].split('\n').filter((node) => !!node);
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
            elasticsearchPlugins.push(pluginName);
          }
        }
      }
      config.set('elasticsearch.plugins', elasticsearchPlugins);
    }).catch(server.log);
  }

  function check() {
    return waitForPong()
    .then(_.partial(checkEsVersion, server))
    .then(waitForShards)
    .then(_.partial(migrateConfig, server))
    .then(waitForPluginList)
    .catch(err => plugin.status.red(err));
  }

  var timeoutId = null;

  function scheduleCheck(ms) {
    if (timeoutId) return;

    var myId = setTimeout(function () {
      check().finally(function () {
        if (timeoutId === myId) startorRestartChecking();
      });
    }, ms);

    timeoutId = myId;
  }

  function startorRestartChecking() {
    scheduleCheck(stopChecking() ? 2500 : 1);
  }

  function stopChecking() {
    if (!timeoutId) return false;
    clearTimeout(timeoutId);
    timeoutId = null;
    return true;
  }

  return {
    run: check,
    start: startorRestartChecking,
    stop: stopChecking,
    isRunning: function () { return !!timeoutId; },
  };

};
