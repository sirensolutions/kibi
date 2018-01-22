/*eslint no-loop-func: 1*/
/*eslint-env es6*/
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_20';
import Scenario from './scenarios/migration_20/scenario';
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

  const checkOriginalRelationId = function (originalRelation) {
    const originalParts = originalRelation.id.split('/');
    expect(originalParts.length).to.be(6);
  };

  const checkUpgradedRelationId = function (upgradedRelation) {
    const upgradedParts = upgradedRelation.id.split('/');
    expect(upgradedParts.length).to.be(1);
  };

  const checkWasUpgraded = function (original, upgraded) {
    const upgradedSirenRelations = JSON.parse(upgraded._source['siren:relations']);
    const originalSirenRelations = JSON.parse(original._source['siren:relations']);

    // check tthat the ids of the old relations differ from the new ones.
    _.each(originalSirenRelations.relationsIndices, (originalRelation) => {
      checkOriginalRelationId(originalRelation);
    });

    _.each(upgradedSirenRelations.relationsIndices, (upgradedRelation) => {
      checkUpgradedRelationId(upgradedRelation);
    });
  };


  describe('Investigate Core - Migration 20 - Functional test', function () {
    let warningSpy;
    let configuration;

    beforeEach(async () => {
      await scenarioManager.reload(Scenario);
    });

    describe('upgradeable siren:relations', function () {
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
        expect(result).to.be(2);
      });

      it('should upgrade all upgradeable objects', async () => {
        const before = await snapshot(indexName);
        const migration = new Migration(configuration);

        let result = await migration.upgrade();
        expect(result).to.be(2);

        const after = await snapshot(indexName);
        expect(before.size).to.equal(after.size);

        const original = before.get('siren');
        const upgraded = after.get('siren');
        checkWasUpgraded(original, upgraded);

        expect(warningSpy.called).to.be(false);

        result = await migration.count();
        expect(result).to.be(0);
      });
    });

    describe('should not update the relations if already with an UUID', function () {
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
        expect(result).to.be(0);
      });
    });

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
    });

  });

});
