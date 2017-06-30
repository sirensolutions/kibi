import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_1';
import Scenario from './scenarios/migration_1/scenario';
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

  describe('Migration 1 - Functional test', function () {
    let warningSpy;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
      warningSpy = sinon.spy(configuration.logger, 'warning');
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      const migration = new Migration(configuration);
      const result = await migration.count();
      expect(result).to.be(4);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      const before = await snapshot();
      const migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(4);

      const after = await snapshot();
      expect(before.size).to.equal(after.size);

      expect(before).to.eql(after);

      const unchanged = [
        'activation_rules',
        'description',
        'kibanaSavedObjectMeta',
        'rest_body',
        'rest_headers',
        'rest_method',
        'rest_params',
        'rest_path',
        'rest_resp_status_code',
        'title'
      ];

      const renamed = new Map();
      renamed.set('st_activationQuery', 'activationQuery');
      renamed.set('st_datasourceId', 'datasourceId');
      renamed.set('st_resultQuery', 'resultQuery');
      renamed.set('st_tags', 'tags');

      const removed = ['rest_resp_restriction_path'];

      for (const [id, original] of before) {
        const upgraded = after.get(id);
        if (original._type === 'config' || original._source.version === 2) {
          expect(original).to.eql(upgraded);
          continue;
        }

        expect(upgraded._source.version).to.be(2);

        if (id === 'top-200-companies') {
          expect(upgraded._source.st_datasourceId).to.equal('sql-datasource');
          expect(upgraded._source.datasourceId).to.equal('sql-datasource-2');
          continue;
        }

        expect(upgraded._source._previewTemplateId).to.be.an('undefined');

        for (const key of unchanged) {
          expect(upgraded._source[key]).to.eql(original._source[key]);
        }

        for (const [oldName, newName] of renamed) {
          expect(upgraded._source[newName]).to.eql(original._source[oldName]);
        }

        for (const key of removed) {
          expect(upgraded._source[key]).to.be.an('undefined');
        }
      }

      expect(warningSpy.calledOnce).to.be(true);
      expect(warningSpy.calledWith('Query with id top-200-companies already contains an attribute named datasourceId' +
                                   ', will not remove attribute st_datasourceId')).to.be(true);

      result = await migration.count();
      expect(result).to.be(0);
    }));

    afterEach(wrapAsync(async () => {
      await scenarioManager.unload(Scenario);
      configuration.logger.warning.restore();
    }));

  });

});
