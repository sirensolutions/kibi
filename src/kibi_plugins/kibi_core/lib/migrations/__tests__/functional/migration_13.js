import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_13';
import Scenario1 from './scenarios/migration_13/scenario1';
import Scenario2 from './scenarios/migration_13/scenario2';
import Scenario3 from './scenarios/migration_13/scenario3';
import Scenario4 from './scenarios/migration_13/scenario4';
import Scenario5 from './scenarios/migration_13/scenario5';
import Scenario6 from './scenarios/migration_13/scenario6';
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

  describe('Migration 13 - Functional test', function () {
    let configuration;

    describe('two indices with sourceFiltering', function () {
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

          if(original._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFiltering = original._source.sourceFiltering;
            expect(sourceFiltering).to.equal('{\"all\":{\"exclude\":[\"city\",\"blog*\"]}}');
          }

          if(original._type === 'index-pattern' && original._id === 'kibi1') {
            const sourceFiltering = original._source.sourceFiltering;
            expect(sourceFiltering).to.equal('{"all":{"exclude":["url"]}}');
          }

          if(upgraded._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFilters = upgraded._source.sourceFilters;
            const sourceFiltering = upgraded._source.sourceFiltering;
            expect(sourceFilters).to.equal('[{"value":"city"},{"value":"blog*"}]');
            expect(sourceFiltering).not.to.be.ok();
          }

          if(upgraded._type === 'index-pattern' && original._id === 'kibi1') {
            const sourceFilters = upgraded._source.sourceFilters;
            const sourceFiltering = upgraded._source.sourceFiltering;
            expect(sourceFilters).to.equal('[{"value":"url"}]');
            expect(sourceFiltering).not.to.be.ok();
          }
        }
      });
    });

    describe('should not migrate include, but exclude should be migrated', function () {
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

          if(original._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFiltering = original._source.sourceFiltering;
            expect(sourceFiltering).to.equal('{\"all\":{\"exclude\":\"city\",\"include\":\"url\"}}');
          }

          if(upgraded._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFilters = upgraded._source.sourceFilters;
            const sourceFiltering = upgraded._source.sourceFiltering;
            expect(sourceFilters).to.equal('[{"value":"city"}]');
            expect(sourceFiltering).not.to.be.ok();
          }
        }
      });
    });

    describe('should not migrate include and kibi_graph_browser with exclude but exclude should be migrated', function () {
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

          if(original._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFiltering = original._source.sourceFiltering;
            expect(sourceFiltering).to.equal('{\"all\":{\"exclude\":\"city\",\"include\":\"url\"},' +
            '\"kibi_graph_browser\":{\"exclude\":\"city\"}}');
          }

          if(upgraded._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFilters = upgraded._source.sourceFilters;
            const sourceFiltering = upgraded._source.sourceFiltering;
            expect(sourceFilters).to.equal('[{"value":"city"}]');
            expect(sourceFiltering).not.to.be.ok();
          }
        }
      });
    });

    describe('should not migrate include and kibi_graph_browser with exclude and include but exclude should be migrated', function () {
      beforeEach(async () => {
        await scenarioManager.reload(Scenario5);
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

          if(original._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFiltering = original._source.sourceFiltering;
            expect(sourceFiltering).to.equal('{\"all\":{\"exclude\":\"city\",\"include\":\"url\"},' +
            '\"kibi_graph_browser\":{\"exclude\":\"city\", \"include\":\"url\"}}');
          }

          if(upgraded._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFilters = upgraded._source.sourceFilters;
            const sourceFiltering = upgraded._source.sourceFiltering;
            expect(sourceFilters).to.equal('[{"value":"city"}]');
            expect(sourceFiltering).not.to.be.ok();
          }
        }
      });
    });

    describe('if there is no exclude but there is include, sourceFiltering should be removed', function () {
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

          if(original._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFiltering = original._source.sourceFiltering;
            expect(sourceFiltering).to.equal('{\"all\":{\"include\":\"city\"}}');
          }

          if(upgraded._type === 'index-pattern' && original._id === 'kibi') {
            const sourceFilters = upgraded._source.sourceFilters;
            const sourceFiltering = upgraded._source.sourceFiltering;
            expect(sourceFilters).not.to.be.ok();
            expect(sourceFiltering).not.to.be.ok();
          }
        }
      });
    });

    describe('should not migrate if there is no "SourceFiltering" property', function () {
      beforeEach(async () => {
        await scenarioManager.reload(Scenario6);
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
        await scenarioManager.unload(Scenario6);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });
    });
  });
});
