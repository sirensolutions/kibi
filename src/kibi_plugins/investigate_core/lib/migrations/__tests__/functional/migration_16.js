import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_16';
import Scenario1 from './scenarios/migration_16/scenario1';
import Scenario2 from './scenarios/migration_16/scenario2';
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
  fakeConfig.get.withArgs('kibana.index').returns('.kibi');

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
    return indexSnapshot(cluster, '.kibi');
  }

  describe('Investigate Core - Migration 16 - Functional test', function () {

    describe('no datasource exist', function () {

      beforeEach(async () => {
        await scenarioManager.reload(Scenario2);
      });

      it('should count all objects and get 0', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });

      it('should try to upgrade and get 0', async () => {
        const before = await snapshot();
        const migration = new Migration(configuration);

        const result = await migration.upgrade();
        expect(result).to.be(0);
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario2);
      });
    });

    describe('some datasource exist', function () {

      beforeEach(async () => {
        await scenarioManager.reload(Scenario1);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(1);
      });

      it('should upgrade all upgradeable objects', async () => {
        const before = await snapshot();
        const migration = new Migration(configuration);

        const result = await migration.upgrade();
        expect(result).to.be(1);

        const after = await snapshot();

        // other datasource should not be touched
        expect(after.size).to.be(before.size);
        expect(before.get('datasource1')).to.eql(after.get('datasource1'));

        // Kibi-Gremlin-Server should be deleted
        const original = before.get('Kibi-Gremlin-Server');
        expect(original).to.be.ok();

        const upgradedOld = after.get('Kibi-Gremlin-Server');
        expect(upgradedOld).to.be(undefined);

        // Siren-Gremlin-Server datasource should be present
        // title should be changed to 'Siren-Gremlin-Server'
        const upgradedNew = after.get('Siren-Gremlin-Server');
        expect(upgradedNew).to.be.ok();
        expect(upgradedNew._source.title).to.equal('Siren-Gremlin-Server');
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario1);
      });

    });
  });
});
