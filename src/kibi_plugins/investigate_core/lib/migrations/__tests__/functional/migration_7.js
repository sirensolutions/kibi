import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_7';
import Scenario1 from './scenarios/migration_7/scenario1';
import Scenario2 from './scenarios/migration_7/scenario2';
import Scenario3 from './scenarios/migration_7/scenario3';
import Scenario4 from './scenarios/migration_7/scenario4';
import Scenario5 from './scenarios/migration_7/scenario5';
import { format as urlFormat } from 'url';

const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const serverConfig = requirefrom('test')('server_config');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');

describe('investigate_core/migrations/functional', function () {

  const clusterUrl = urlFormat(serverConfig.servers.elasticsearch);
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
      error: (message) => {},
      info: (message) => {}
    }
  };

  describe('Kibi Core Migration 7 - Functional test', function () {
    let Scenario;

    async function snapshot() {
      return indexSnapshot(cluster, '.siren');
    }

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
    });

    it('should migrate old configuration', async () => {
      Scenario = Scenario1;
      await scenarioManager.reload(Scenario);

      const before = await snapshot();
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(1);

      result = await migration.upgrade();
      expect(result).to.be(1);

      const after = await snapshot();
      expect(before.size + 1).to.equal(after.size);

      const upgraded = after.get('kibi');
      expect(upgraded._source['dateFormat:tz']).to.be('UTC');
      expect(Object.getOwnPropertyNames(upgraded._source)).to.have.length(1);
    });

    it('should not migrate old configuration if new one exists', async () => {
      Scenario = Scenario2;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);
    });

    it('should not do anything if no old configuration exist', async () => {
      Scenario = Scenario3;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);
    });

    it('should not do anything if there are only SNAPSHOT configurations', async () => {
      Scenario = Scenario4;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);
    });

    it('should take the configuration from a release, not a SNAPSHOT', async () => {
      Scenario = Scenario5;
      await scenarioManager.reload(Scenario);

      const before = await snapshot();
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(1);

      result = await migration.upgrade();
      expect(result).to.be(1);

      const after = await snapshot();
      expect(before.size + 1).to.equal(after.size);
      expect(after.get('kibi')._source['dateFormat:tz']).to.be('new-york');
    });
  });
});

