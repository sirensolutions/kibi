import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_6';
import Scenario1 from './scenarios/migration_6/scenario1';
import Scenario2 from './scenarios/migration_6/scenario2';
import Scenario3 from './scenarios/migration_6/scenario3';
import Scenario4 from './scenarios/migration_6/scenario4';
import { format as urlFormat } from 'url';

const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const serverConfig = requirefrom('test')('server_config');

describe('kibi_core/migrations/functional', function () {

  const clusterUrl = urlFormat(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const fakeConfig = {
    get: sinon.stub()
  };
  fakeConfig.get.withArgs('kibana.index').returns('.kibi');

  const scenarioManager = new ScenarioManager(clusterUrl, timeout);
  const client = new elasticsearch.Client({
    host: clusterUrl,
    requestTimeout: timeout
  });
  const configuration = {
    config: fakeConfig,
    client: client,
    logger: {
      error: (message) => {},
      info: (message) => {}
    }
  };

  describe('Kibi Core Migration 6 - Functional test', function () {
    let infoSpy;
    let errorSpy;
    let Scenario;

    beforeEach(async () => {
      infoSpy = sinon.spy(configuration.logger, 'info');
      errorSpy = sinon.spy(configuration.logger, 'error');
    });

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
      configuration.logger.info.restore();
      configuration.logger.error.restore();
    });

    it('should set mapping for sirenSession if not present', async () => {
      Scenario = Scenario1;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(1);

      result = await migration.upgrade();
      expect(result).to.be(1);

      sinon.assert.notCalled(errorSpy);
      sinon.assert.calledWith(infoSpy, 'Going to set the mapping for url.sirenSession property');
    });

    it('should NOT set mapping for sirenSession if already present', async () => {
      Scenario = Scenario2;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);

      sinon.assert.notCalled(errorSpy);
      sinon.assert.notCalled(infoSpy);
    });

    it('should copy kibiSession to sirenSession if present', async () => {
      Scenario = Scenario3;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(1);

      result = await migration.upgrade();
      expect(result).to.be(1);

      sinon.assert.notCalled(errorSpy);
      sinon.assert.calledWith(infoSpy, 'Updating the url object with _id=1');
    });

    it('should NOT copy kibiSession if == null', async () => {
      Scenario = Scenario4;
      await scenarioManager.reload(Scenario);
      const migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(0);

      result = await migration.upgrade();
      expect(result).to.be(0);

      sinon.assert.notCalled(errorSpy);
      sinon.assert.notCalled(infoSpy);
    });

  });
});

