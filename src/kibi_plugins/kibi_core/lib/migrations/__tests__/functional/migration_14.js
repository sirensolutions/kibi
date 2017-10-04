import expect from 'expect.js';
import sinon from 'sinon';
import _ from 'lodash';
import requirefrom from 'requirefrom';
import Migration from '../../migration_14';
import Scenario1 from './scenarios/migration_14/scenario1';
import Scenario2 from './scenarios/migration_14/scenario2';
import Scenario3 from './scenarios/migration_14/scenario3';
import Scenario4 from './scenarios/migration_14/scenario4';
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

  describe('Migration 14 - Functional test', function () {
    let configuration;

    describe('two visualisations with "exclude" and "include" property', function () {
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
        expect(result).to.be(2);
      });

      it('should upgrade all upgradeable objects', async () => {
        const before = await snapshot();
        const migration = new Migration(configuration);
        const result = await migration.upgrade();
        expect(result).to.be(2);
        const after = await snapshot();

        for (const [id, original] of before) {
          const upgraded = after.get(id);

          if(original._type === 'visualization' && original._id === 'vis') {
            const kibanaSavedObjectMeta = original._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"source\":{\"exclude\":\"rnews:articleBody\"}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }

          if(original._type === 'visualization' && original._id === 'vis1') {
            const kibanaSavedObjectMeta = original._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"source\":{\"include\":\"rnews:companyBody\"}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }

          if(upgraded._type === 'visualization' && original._id === 'vis') {
            const kibanaSavedObjectMeta = upgraded._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"source\":{}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }

          if(upgraded._type === 'visualization' && original._id === 'vis1') {
            const kibanaSavedObjectMeta = upgraded._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"source\":{}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }
        }
      });
    });

    describe('one visualisation with "exclude" and "include" property', function () {
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
            const kibanaSavedObjectMeta = original._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"source\":{\"include\":\"rnews:articleBody\", \"exclude\":\"rnews:companyBody\"}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }

          if(upgraded._type === 'visualization' && original._id === 'vis') {
            const kibanaSavedObjectMeta = upgraded._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"source\":{}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }
        }
      });
    });

    describe('should remove only "include" and "exclude" in source', function () {
      beforeEach(async () => {
        await scenarioManager.reload(Scenario4);
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
            const kibanaSavedObjectMeta = original._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"filters\":{}, \"source\":{\"include\":\"rnews:articleBody\", \"exclude\":\"rnews:companyBody\"}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }

          if(upgraded._type === 'visualization' && original._id === 'vis') {
            const kibanaSavedObjectMeta = upgraded._source.kibanaSavedObjectMeta;
            const expectedResult = {
              "searchSourceJSON": "{\"filters\":{}}"
            };
            expect(_.isEqual(expectedResult,kibanaSavedObjectMeta)).to.equal(true);
          }
        }
      });
    });

    describe('should not migrate if there is no "include" or "exclude" property in source', function () {
      beforeEach(async () => {
        await scenarioManager.reload(Scenario3);
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
