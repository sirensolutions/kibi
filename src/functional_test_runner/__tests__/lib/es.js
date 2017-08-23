import { resolve } from 'path';

import { once, merge } from 'lodash';
import libesvm from 'libesvm';

// kibi: use a working branch
const VERSION = '5.4';
// kibi: switch to binary when https://esvm-props.kibana.rocks/builds
const BINARY = 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-5.4.3.tar.gz';
const DIRECTORY = resolve(__dirname, '../../../../esvm/functional_test_runner_tests');

const createCluster = (options = {}) => {
  return libesvm.createCluster(merge({
    directory: DIRECTORY,
    binary: BINARY
    //TODO MERGE 5.5.2 add kibi comment as needed
    //branch: VERSION,
  }, options));
};

const install = once(async (fresh) => {
  await createCluster({ fresh }).install();
});

export async function startupEs(opts) {
  const {
    port,
    log,
    fresh = true
  } = opts;

  await install({ fresh });
  const cluster = createCluster({
    config: {
      http: {
        port
      }
    }
  });

  cluster.on('log', (event) => {
    const method = event.level.toLowerCase() === 'info' ? 'verbose' : 'debug';
    log[method](`${event.level}: ${event.type} - ${event.message}`);
  });

  await cluster.start();
  return cluster;
}
