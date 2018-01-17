import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_12';
import Scenario1 from './scenarios/migration_12/scenario1';
import Scenario2 from './scenarios/migration_12/scenario2';
import Scenario3 from './scenarios/migration_12/scenario3';
import url from 'url';
import { find } from 'lodash';

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

  async function snapshot() {
    return indexSnapshot(cluster, '.siren');
  }

  describe('Investigate Core - Migration 12 kibi:defaultDashboardId - Functional test', function () {
    let configuration;


    describe('should migrate if investigate_core.default_dashboard_title is defined and', function () {

      describe('valid dashboard from investigate_core.default_dashboard_title exist and nothing in kibi:defaultDashboardId', function () {
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

          fakeConfig.get.withArgs('investigate_core.default_dashboard_title').returns('Company');
        });

        afterEach(async () => {
          await scenarioManager.unload(Scenario1);
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

            if(original._type === 'config') {
              const originalDefaultDashboard = original._source['kibi:defaultDashboardId'];
              expect(originalDefaultDashboard).to.equal(undefined);
            }

            if(upgraded._type === 'config') {
              const upgradedDefaultDashboard = upgraded._source['kibi:defaultDashboardId'];
              expect(upgradedDefaultDashboard).to.equal('CompanyId');
            }
          }
        });
      });

      describe('valid dashboard from investigate_core.default_dashboard_title exist' +
      ' and invalid dashboard in kibi:defaultDashboardId', function () {
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

          fakeConfig.get.withArgs('investigate_core.default_dashboard_title').returns('Company');
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

            if(original._type === 'config') {
              const originalDefaultDashboard = original._source['kibi:defaultDashboardId'];
              expect(originalDefaultDashboard).to.equal('ArticlesId');
            }

            if(upgraded._type === 'config') {
              const upgradedDefaultDashboard = upgraded._source['kibi:defaultDashboardId'];
              expect(upgradedDefaultDashboard).to.equal('CompanyId');
            }
          }
        });
      });
    });

    describe('should NOT migrate if', function () {

      describe('investigate_core.default_dashboard_title NOT defined', function () {
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

          fakeConfig.get.withArgs('investigate_core.default_dashboard_title').returns('');
        });

        afterEach(async () => {
          await scenarioManager.unload(Scenario1);
        });

        it('should count all upgradeable objects', async () => {
          const migration = new Migration(configuration);
          const result = await migration.count();
          expect(result).to.be(0);
        });

        it('should NOT upgrade anything', async () => {
          const before = await snapshot();
          const migration = new Migration(configuration);

          const result = await migration.upgrade();
          expect(result).to.be(0);
          const after = await snapshot();

          for (const [id, original] of before) {
            const upgraded = after.get(id);

            if(original._type === 'config') {
              const originalDefaultDashboard = original._source['kibi:defaultDashboardId'];
              const upgradedDefaultDashboard = upgraded._source['kibi:defaultDashboardId'];
              expect(originalDefaultDashboard).to.equal(upgradedDefaultDashboard);
            }
          }
        });
      });

      describe('investigate_core.default_dashboard_title defined but dashboard does NOT exist', function () {
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

          fakeConfig.get.withArgs('investigate_core.default_dashboard_title').returns('doNotExistDashboard');
        });

        afterEach(async () => {
          await scenarioManager.unload(Scenario1);
        });

        it('should count all upgradeable objects', async () => {
          const migration = new Migration(configuration);
          const result = await migration.count();
          expect(result).to.be(0);
        });

        it('should NOT upgrade anything', async () => {
          const before = await snapshot();
          const migration = new Migration(configuration);

          const result = await migration.upgrade();
          expect(result).to.be(0);
          const after = await snapshot();

          for (const [id, original] of before) {
            const upgraded = after.get(id);

            if(original._type === 'config') {
              const originalDefaultDashboard = original._source['kibi:defaultDashboardId'];
              const upgradedDefaultDashboard = upgraded._source['kibi:defaultDashboardId'];
              expect(originalDefaultDashboard).to.equal(upgradedDefaultDashboard);
            }
          }
        });
      });

      describe('investigate_core.default_dashboard_title defined, dashboard exist, ' +
               'but valid dashboard id already set in advanced settings', function () {
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

          fakeConfig.get.withArgs('investigate_core.default_dashboard_title').returns('Article');
        });

        afterEach(async () => {
          await scenarioManager.unload(Scenario3);
        });

        it('should count all upgradeable objects', async () => {
          const migration = new Migration(configuration);
          const result = await migration.count();
          expect(result).to.be(0);
        });

        it('should NOT upgrade anything', async () => {
          const before = await snapshot();
          const migration = new Migration(configuration);

          const result = await migration.upgrade();
          expect(result).to.be(0);
          const after = await snapshot();

          for (const [id, original] of before) {
            const upgraded = after.get(id);

            if(original._type === 'config') {
              const originalDefaultDashboard = original._source['kibi:defaultDashboardId'];
              const upgradedDefaultDashboard = upgraded._source['kibi:defaultDashboardId'];
              expect(originalDefaultDashboard).to.equal(upgradedDefaultDashboard);
            }
          }
        });

      });
    });

  });
});
