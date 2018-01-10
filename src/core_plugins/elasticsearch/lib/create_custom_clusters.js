import { bindKey, each } from 'lodash';
import { clientLogger } from './client_logger';

export function createCustomClusters(server) {
  const config = server.config();
  const ElasticsearchClientLogging = clientLogger(server);

  function getConfig(config) {
    if (Boolean(config.tribe.url)) {
      return config.tribe;
    }

    return config;
  }


  const clustersConfig = config.get('elasticsearch.clusters');
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
