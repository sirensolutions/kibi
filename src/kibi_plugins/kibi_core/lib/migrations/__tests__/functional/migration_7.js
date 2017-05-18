import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import requirefrom from 'requirefrom';
import Migration from '../../migration_7';
import Scenario1 from './scenarios/migration_7/scenario1';
import Scenario2 from './scenarios/migration_7/scenario2';
import Scenario3 from './scenarios/migration_7/scenario3';
import { format as urlFormat } from 'url';

const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const serverConfig = requirefrom('test')('server_config');

describe('kibi_core/migrations/functional', function () {

  const clusterUrl = urlFormat(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const scenarioManager = new ScenarioManager(clusterUrl, timeout);
  const client = new elasticsearch.Client({
    host: clusterUrl,
    requestTimeout: timeout
  });
  const configuration = {
    index: '.kibi',
    client,
    logger: {
      error: (message) => {},
      info: (message) => {}
    }
  };

  describe('Kibi Core Migration 7 - Functional test', function () {
    let infoSpy;
    let Scenario;

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
    });

    it('should migrate old configuration', async () => {
      Scenario = Scenario1;
      await scenarioManager.reload(Scenario1);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(1);

      result = await migration.upgrade();
      expect(result).to.be(1);
    });

    it('should not migrate old configuration if new one exists', async () => {
      Scenario = Scenario2;
      await scenarioManager.reload(Scenario2);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);
    });

    it('should not do anything if no old configuration exist', async () => {
      Scenario = Scenario3;
      await scenarioManager.reload(Scenario3);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);
    });
  });
});

