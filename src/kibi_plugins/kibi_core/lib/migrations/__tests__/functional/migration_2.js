import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_2';
import Scenario from './scenarios/migration_2/scenario';
import url from 'url';

const serverConfig = requirefrom('test')('server_config');
const wrapAsync = requirefrom('src/test_utils')('wrap_async');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');

describe('kibi_core/migrations/functional', function () {

  const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const scenarioManager = new ScenarioManager(clusterUrl, timeout);
  const cluster = new Cluster({
    url: clusterUrl,
    requestTimeout: timeout
  });
  const configuration = {
    index: '.kibi',
    client: cluster.getClient(),
    logger: {
      warning: (message) => ''
    }
  };

  async function snapshot() {
    return indexSnapshot(cluster, '.kibi');
  }

  describe('Migration 2 - Functional test', function () {
    let warningSpy;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
      warningSpy = sinon.spy(configuration.logger, 'warning');
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      const migration = new Migration(configuration);
      const result = await migration.count();
      expect(result).to.be(3);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      const before = await snapshot();
      const migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(3);

      const after = await snapshot();
      expect(before.size).to.equal(after.size);

      const unchanged = [
        'description',
        'kibanaSavedObjectMeta',
        'title'
      ];

      const renamed = new Map();
      renamed.set('st_templateEngine', 'templateEngine');
      renamed.set('st_templateSource', 'templateSource');

      for (const [id, original] of before) {
        const upgraded = after.get(id);
        if (original._type === 'config' || original._source.version === 2) {
          expect(original).to.eql(upgraded);
          continue;
        }

        expect(upgraded._source.version).to.be(2);

        if (id === 'kibi-jinja2') {
          expect(upgraded._source.st_templateEngine).to.equal('jinja');
          expect(upgraded._source.templateEngine).to.equal('jinja2');
          continue;
        }

        for (const key of unchanged) {
          expect(upgraded._source[key]).to.eql(original._source[key]);
        }

        for (const [oldName, newName] of renamed) {
          expect(upgraded._source[newName]).to.eql(original._source[oldName]);
        }
      }

      expect(warningSpy.calledOnce).to.be(true);
      expect(warningSpy.calledWith('Template with id kibi-jinja2 already contains an attribute named templateEngine' +
        ', will not remove attribute st_templateEngine')).to.be(true);

      result = await migration.count();
      expect(result).to.be(0);
    }));

    afterEach(wrapAsync(async () => {
      await scenarioManager.unload(Scenario);
      warningSpy.restore();
    }));

  });

});
