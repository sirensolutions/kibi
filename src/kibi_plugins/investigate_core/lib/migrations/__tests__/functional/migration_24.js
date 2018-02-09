/*eslint no-loop-func: 1*/
/*eslint-env es6*/
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_24';
import Scenario from './scenarios/migration_24/scenario';
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

  const scenarioManager = new ScenarioManager(clusterUrl, timeout);
  const cluster = new Cluster({
    url: clusterUrl,
    ssl: { verificationMode: 'none' },
    requestTimeout: timeout
  });

  async function snapshot(indexName) {
    return indexSnapshot(cluster, indexName);
  }

  beforeEach(async () => {
    await scenarioManager.reload(Scenario);
  });

  describe('Investigate Core - Migration 24 - Functional test', function () {
    let warningSpy;
    let configuration;

    describe('sourceFilters missing from index mapping', function () {
      const indexName = '.siren2';

      beforeEach(() => {
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        warningSpy = configuration.logger.warning;
        fakeConfig.get.withArgs('kibana.index').returns(indexName);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(1);
      });

      it('should upgrade all upgradeable objects', async () => {
        const before = await snapshot(indexName);
        const migration = new Migration(configuration);

        let result = await migration.upgrade();
        expect(result).to.be(1);

        const mapping = await configuration.client.indices.getMapping({ type: 'index-pattern', index: indexName });
        const indexPatternMapping = mapping[indexName].mappings['index-pattern'];
        const defaultIndexPatternMapping = await migration.getDefaultSourceFiltersMapping();

        expect(indexPatternMapping.properties.sourceFilters).to.eql(defaultIndexPatternMapping);

        result = await migration.count();
        expect(result).to.be(0);
      });
    });

    describe('sourceFilters exists in mapping', function () {
      const indexName = '.siren1';

      beforeEach(() => {
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        warningSpy = configuration.logger.warning;
        fakeConfig.get.withArgs('kibana.index').returns(indexName);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      });
    });

  });

  afterEach(async () => {
    await scenarioManager.unload(Scenario);
  });

});
