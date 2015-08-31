var Promise = require('bluebird');
var NoConnections = require('elasticsearch').errors.NoConnections;

var client = require('./elasticsearch_client');
var logger = require('./logger');
var config = require('../config');

function waitForPong() {
  return client.ping({requestTimeout: config.kibana.startup_timeout})
  .catch(function (err) {
    if (!(err instanceof NoConnections)) throw err;

    logger.info('Unable to connect to elasticsearch at %s. Retrying in 2.5 seconds.', config.elasticsearch);
    return Promise.delay(2500).then(waitForPong);
  });
}

function waitForShards() {
  return client.cluster.health({
    timeout: '5s', // tells es to not sit around and wait forever
    index: config.kibana.kibana_index
  })
  .then(function (resp) {
    // if "timed_out" === true then elasticsearch could not
    // find any idices matching our filter within 5 seconds
    if (resp.timed_out) {
      logger.info('No existing kibana index found');
      return;
    }

    // If status === "red" that means that index(es) were found
    // but the shards are not ready for queries
    if (resp.status === 'red') {
      logger.info('Elasticsearch is still initializing the kibana index... Trying again in 2.5 second.');
      return Promise.delay(2500).then(waitForShards);
    }

    // otherwise we are g2g
    logger.info('Found kibana index');
  });
}

function waitForPluginList() {
  return client.cat.nodes({'h': 'name'})
  .then(function (resp) {
    var nodes = resp.split('\n').filter(function (node) {
      return !!node;
    });
    return client.cat.plugins({'h': 'component'})
    .then(function (resp) {
      if (resp) {
        var plugin_counts = resp.split('\n').filter(function (plugin) {
          return !!plugin;
        }).map(function (plugin) {
          return plugin.trim();
        }).reduce(function (prev, curr, index, array) {
          if (prev[curr]) {
            prev[curr] += 1;
          } else {
            prev[curr] = 1;
          }
          return prev;
        }, {});

        config.elasticsearch_plugins = [];
        for (var plugin_name in plugin_counts) {
          if (plugin_counts[plugin_name] === nodes.length) {
            config.elasticsearch_plugins.push(plugin_name);
          }
        }
      } else {
        config.elasticsearch_plugins = [];
      }
    });
  });
}

module.exports = function () {
  return waitForPong().then(waitForShards).then(waitForPluginList);
};
