import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const indexSnapshot = requirefrom('src/testUtils')('index_snapshot');
const ScenarioManager = requirefrom('src/testUtils')('scenario_manager');
import Migration from '../../migration_1';
import Scenario from './scenarios/migration_1/scenario';
import serverConfig from '../../../../../../../test/serverConfig';
import url from 'url';

describe('kibi_core/migrations/functional', function () {

  let clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  let timeout = 60000;
  this.timeout(timeout);

  let scenarioManager = new ScenarioManager(clusterUrl, timeout);
  let client = new elasticsearch.Client({
    host: clusterUrl,
    requestTimeout: timeout
  });
  let configuration = {
    index: '.kibi',
    client: client,
    logger: {
      warning: (message) => ''
    }
  };

  async function snapshot() {
    return indexSnapshot(client, '.kibi');
  }

  describe('Migration 1 - Functional test', function () {
    let warningSpy;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
      warningSpy = sinon.spy(configuration.logger, 'warning');
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      let migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(4);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      let before = await snapshot();
      let migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(4);

      let after = await snapshot();
      expect(before.size).to.equal(after.size);

      expect(before).to.eql(after);

      let unchanged = [
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

      let renamed = new Map();
      renamed.set('st_activationQuery', 'activationQuery');
      renamed.set('st_datasourceId', 'datasourceId');
      renamed.set('st_resultQuery', 'resultQuery');
      renamed.set('st_tags', 'tags');

      let removed = ['rest_resp_restriction_path'];

      for (let [id, original] of before) {
        let upgraded = after.get(id);
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

        for (let key of unchanged) {
          expect(upgraded._source[key]).to.eql(original._source[key]);
        }

        for (let [oldName, newName] of renamed) {
          expect(upgraded._source[newName]).to.eql(original._source[oldName]);
        }

        for (let key of removed) {
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
