import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_11';
import Scenario from './scenarios/migration_11/scenario1';
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

  describe('Migration 11 - Functional test', function () {

    beforeEach(async () => {
      await scenarioManager.reload(Scenario);
    });

    it('should count all upgradeable objects', async () => {
      const migration = new Migration(configuration);
      const result = await migration.count();
      expect(result).to.be(1);
    });

    it('should upgrade all upgradeable objects', async () => {
      const before = await snapshot();
      const migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(1);

      const after = await snapshot();

      expect(after.size).to.be(before.size);
      expect(before.get('heatmap5')).to.eql(after.get('heatmap5'));

      const original = before.get('heatmap4');
      const upgraded = after.get('heatmap4');

      for (const key of [
        'description',
        'kibanaSavedObjectMeta',
        'title',
        'version'
      ]) {
        expect(original[key]).to.eql(upgraded[key]);
      }

      expect(upgraded._source.uiStateJSON).to.eql('{}');

      const originalVisState = JSON.parse(original._source.visState);
      const upgradedVisState = JSON.parse(upgraded._source.visState);

      expect(upgradedVisState.params.margin).to.be(undefined);
      expect(upgradedVisState.params.colorsNumber).to.be(originalVisState.params.numberOfColors);

      expect(upgradedVisState.aggs).to.have.length(originalVisState.aggs.length);
      upgradedVisState.aggs.forEach(upgradedAgg => {
        const originalAgg = find(originalVisState.aggs, 'id', upgradedAgg.id);

        expect(originalAgg).to.be.ok();
        expect(upgradedAgg.params).to.be.eql(originalAgg.params);
        expect(upgradedAgg.enabled).to.be(true);
        switch (originalAgg.schema) {
          case 'columns':
            expect(upgradedAgg.schema).to.be('segment');
            break;
          case 'rows':
            expect(upgradedAgg.schema).to.be('group');
            break;
          default:
            expect(upgradedAgg.schema).to.be(originalAgg.schema);
        }
      });

      result = await migration.count();
      expect(result).to.be(0);
    });

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
    });

  });

});
