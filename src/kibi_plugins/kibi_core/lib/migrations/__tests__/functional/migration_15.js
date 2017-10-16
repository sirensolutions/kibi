import expect from 'expect.js';
import sinon from 'sinon';
import _ from 'lodash';
import requirefrom from 'requirefrom';
import Migration from '../../migration_15';
import Scenario1 from './scenarios/migration_15/scenario1';
import Scenario2 from './scenarios/migration_15/scenario2';
import Scenario3 from './scenarios/migration_15/scenario3';
import Scenario4 from './scenarios/migration_15/scenario4';
import Scenario5 from './scenarios/migration_15/scenario5';
import url from 'url';

const serverConfig = requirefrom('test')('server_config');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');

describe('kibi_core/migrations/functional', function () {

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

  async function snapshot() {
    return indexSnapshot(cluster, '.kibi');
  }

  describe('Migration 15 - Functional test', function () {
    let configuration;

    describe('one config with string "discover:sampleSize" and two visualization with string "pageSize"', function () {
      beforeEach(async () => {
        await scenarioManager.reload(Scenario1);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario1);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(3);
      });

      it('should upgrade all upgradeable objects', async () => {
        const before = await snapshot();
        const migration = new Migration(configuration);
        const result = await migration.upgrade();
        expect(result).to.be(3);
        const after = await snapshot();

        for (const [id, original] of before) {
          const upgraded = after.get(id);

          if(original._type === 'visualization' && original._id === 'vis') {
            const visState = original._source.visState;
            const expectedResult = '{"title":"vis","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":"40"}}';
            expect(visState).to.equal(expectedResult);
          }

          if(original._type === 'visualization' && original._id === 'vis1') {
            const visState = original._source.visState;
            const expectedResult = '{"title":"vis1","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":"30"}}';
            expect(visState).to.equal(expectedResult);
          }

          if(original._type === 'config' && original._id === 'conf') {
            const sampleSize = original._source['discover:sampleSize'];
            const expectedResult = '50';
            expect(sampleSize).to.equal(expectedResult);
          }

          if(upgraded._type === 'visualization' && upgraded._id === 'vis') {
            const visState = upgraded._source.visState;
            const expectedResult = '{"title":"vis","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":40}}';
            expect(visState).to.equal(expectedResult);
          }

          if(upgraded._type === 'visualization' && upgraded._id === 'vis1') {
            const visState = upgraded._source.visState;
            const expectedResult = '{"title":"vis1","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":30}}';
            expect(visState).to.equal(expectedResult);
          }

          if(upgraded._type === 'config' && upgraded._id === 'conf') {
            const sampleSize = upgraded._source['discover:sampleSize'];
            const expectedResult = 50;
            expect(sampleSize).to.equal(expectedResult);
          }
        }
      });
    });

    describe('two visualization with "pageSize", one of them string other one integer', function () {
      beforeEach(async () => {
        await scenarioManager.reload(Scenario2);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario2);
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

        for (const [id, original] of before) {
          const upgraded = after.get(id);

          if(original._type === 'visualization' && original._id === 'vis') {
            const visState = original._source.visState;
            const expectedResult = '{"title":"vis","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":"40"}}';
            expect(visState).to.equal(expectedResult);
          }

          if(original._type === 'visualization' && original._id === 'vis1') {
            const visState = original._source.visState;
            const expectedResult = '{"title":"vis1","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":30}}';
            expect(visState).to.equal(expectedResult);
          }

          if(upgraded._type === 'visualization' && upgraded._id === 'vis') {
            const visState = upgraded._source.visState;
            const expectedResult = '{"title":"vis","type":"kibi-data-table",' +
            '"params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":40}}';
            expect(visState).to.equal(expectedResult);
          }
        }
      });
    });
    describe('should not migrate if there is no .kibi index', function () {
      beforeEach(async () => {
        await scenarioManager.load(Scenario4);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario4);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });
    });

    describe('should not migrate if there is no config', function () {
      beforeEach(async () => {
        await scenarioManager.load(Scenario5);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario5);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });
    });

    describe('should not migrate if there is no "discover:sampleSize" or "pageSize" property', function () {
      beforeEach(async () => {
        await scenarioManager.load(Scenario3);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
      });

      afterEach(async () => {
        await scenarioManager.unload(Scenario3);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });
    });
  });
});
