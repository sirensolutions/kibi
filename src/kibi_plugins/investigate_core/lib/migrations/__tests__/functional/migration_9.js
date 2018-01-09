import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_9';
import Scenario from './scenarios/migration_9/scenario';
import url from 'url';

const serverConfig = requirefrom('test')('server_config');
const wrapAsync = requirefrom('src/test_utils')('wrap_async');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');

describe('investigate_core/migrations/functional', function () {

  const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const fakeConfig = {
    get: sinon.stub()
  };
  fakeConfig.get.withArgs('kibana.index').returns('.siren');

  const scenarioManager = new ScenarioManager(clusterUrl, timeout);
  const cluster = new Cluster({
    url: clusterUrl,
    ssl: { verificationMode: 'none' },
    requestTimeout: timeout
  });
  const configuration = {
    config: fakeConfig,
    client: cluster.getClient(),
    logger: {
      warning: (message) => ''
    }
  };

  async function snapshot() {
    return indexSnapshot(cluster, '.siren');
  }

  describe('Migration 9 - Functional test', function () {

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      const migration = new Migration(configuration);
      const result = await migration.count();
      expect(result).to.be(1);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      const before = await snapshot();
      const migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(1);

      result = await migration.count();
      expect(result).to.be(0);
    }));

    afterEach(wrapAsync(async () => {
      await scenarioManager.unload(Scenario);
    }));

  });

});
