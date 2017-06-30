import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_10';
import Scenario from './scenarios/migration_10/scenario1';
import url from 'url';

const serverConfig = requirefrom('test')('server_config');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');

describe('kibi_core/migrations/functional', function () {

  const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const stub = sinon.stub();
  const fakeConfig = {
    get: stub
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

  describe('Migration 10 - Functional test', function () {

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
      expect(before.get('Articles-Tagcloud')).to.eql(after.get('Articles-Tagcloud'));

      const original = before.get('Articles-Wordcloud');
      const upgraded = after.get('Articles-Wordcloud');

      for (const key of [
        'description',
        'kibanaSavedObjectMeta',
        'savedSearchId',
        'title',
        'version'
      ]) {
        expect(original[key]).to.eql(upgraded[key]);
      }

      expect(upgraded._source.uiStateJSON).to.eql('{}');

      const originalVisState = JSON.parse(original._source.visState);
      const upgradedVisState = JSON.parse(upgraded._source.visState);

      expect(upgradedVisState.type).to.eql('tagcloud');
      expect(upgradedVisState.params).to.eql({
        scale: 'linear',
        orientation: 'single',
        minFontSize: 18,
        maxFontSize: 72
      });

      expect(upgradedVisState.aggs.length).to.be(2);
      expect(originalVisState.aggs.length).to.eql(upgradedVisState.aggs.length);

      let foundBucket = false;
      upgradedVisState.aggs.forEach((agg, index) => {
        expect(agg.enabled).to.be(true);

        for (const key in agg) {
          if (!agg.hasOwnProperty(key)) {
            continue;
          }
          if (key === 'enabled') {
            continue;
          }
          if (key === 'schema' && originalVisState.aggs[index][key] === 'bucket') {
            foundBucket = true;
            expect(agg[key]).to.eql('segment');
            continue;
          }
          expect(originalVisState.aggs[index][key]).to.eql(agg[key]);
        }
      });

      expect(foundBucket).to.be(true);

      result = await migration.count();
      expect(result).to.be(0);
    });

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
    });

  });

});
