import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const indexSnapshot = requirefrom('src/testUtils')('index_snapshot');
const ScenarioManager = requirefrom('src/testUtils')('scenario_manager');
import Migration from '../../migration_2';
import Scenario from './scenarios/migration_2/scenario';
import serverConfig from '../../../../../../../test/serverConfig';
import url from 'url';

describe('kibi_core/migrations/functional', function () {

  let clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  let timeout = 60000;
  this.timeout(timeout);

  const fakeConfig = {
    get: sinon.stub()
  };
  fakeConfig.get.withArgs('kibana.index').returns('.kibi');

  let scenarioManager = new ScenarioManager(clusterUrl, timeout);
  let client = new elasticsearch.Client({
    host: clusterUrl,
    requestTimeout: timeout
  });
  let configuration = {
    config: fakeConfig,
    client: client,
    logger: {
      warning: (message) => {}
    }
  };

  async function snapshot() {
    return indexSnapshot(client, '.kibi');
  }

  describe('Migration 2 - Functional test', function () {
    let warningSpy;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
      warningSpy = sinon.spy(configuration.logger, 'warning');
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      let migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(3);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      let before = await snapshot();
      let migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(3);

      let after = await snapshot();
      expect(before.size).to.equal(after.size);

      let unchanged = [
        'description',
        'kibanaSavedObjectMeta',
        'title'
      ];

      let renamed = new Map();
      renamed.set('st_templateEngine', 'templateEngine');
      renamed.set('st_templateSource', 'templateSource');

      for (let [id, original] of before) {
        let upgraded = after.get(id);
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

        for (let key of unchanged) {
          expect(upgraded._source[key]).to.eql(original._source[key]);
        }

        for (let [oldName, newName] of renamed) {
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
