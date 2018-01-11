import { bindKey, each } from 'lodash';
import { clientLogger } from './client_logger';

export const CLUSTERS_PROPERTY = 'elasticsearch.siren.clusters';
export const CONNECTOR_CLUSTER_PROPERTY = 'elasticsearch.siren.connector.admin.cluster';
export const ALERT_CLUSTER_PROPERTY = 'elasticsearch.siren.alert.admin.cluster';

export function getConfigMismatchErrorMessage(clusterName, clusterProperty) {
  return 'Could not find configuration for [' + clusterName + '] cluster. ' +
         'Check if there is a match between ' + clusterProperty + ' property ' +
         'and any cluster configured in elasticsearch.siren.clusters property';
}

export function createCustomClusters(server) {
  const config = server.config();
  const ElasticsearchClientLogging = clientLogger(server);

  function getConfig(config) {
    if (Boolean(config.tribe.url)) {
      return config.tribe;
    }
    return config;
  }

  const clustersConfig = config.get('elasticsearch.siren.clusters');
  each(clustersConfig, (conf, key) => {
    let config = conf;
    if (Boolean(conf.tribe.url)) {
      config = conf.tribe;
    }

    class DataClientLogging extends ElasticsearchClientLogging {
      tags = ['cluster:' + key];
      logQueries = config.logQueries;
    }

    const customCluster = server.plugins.elasticsearch.createCluster(
      key,
      Object.assign({ log: DataClientLogging }, config)
    );

    server.on('close', bindKey(customCluster, 'close'));
  });
}

