import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_17';
import Scenario1 from './scenarios/migration_17/scenario1';
import Scenario2 from './scenarios/migration_17/scenario2';
import url from 'url';

const serverConfig = requirefrom('test')('server_config');
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

  describe('Investigate Core - Migration 17 - Functional test', function () {

    describe('if config with kibi id exists', function () {

      beforeEach(async () => {
        await scenarioManager.reload(Scenario1);
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario1);
      });

      it('should count all objects and get 1', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(1);
      });

      it('should try to upgrade and get 0 on a subsequent count', async () => {
        const before = await snapshot();
        const migration = new Migration(configuration);

        const result = await migration.upgrade();
        expect(result).to.be(1);

        const newCount = await migration.count();
        expect(newCount).to.be(0);
      });

      it('should store the old config object with only the id changed', async () => {
        const beforeSnapshot = await snapshot();
        const migration = new Migration(configuration);
        const result = await migration.upgrade();
        const afterSnapshot = await snapshot();

        const before = beforeSnapshot.get('kibi');
        const after = afterSnapshot.get('siren');

        expect(before._id).to.equal('kibi');
        expect(after._id).to.equal('siren');

        before._id = after._id = undefined;

        expect(before).to.eql(after);
      });
    });

    describe('if config with siren id exists', function () {

      beforeEach(async () => {
        await scenarioManager.reload(Scenario2);
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario2);
      });

      it('should count all objects and get 0', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });
    });
  });
});
