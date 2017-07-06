/*eslint no-loop-func: 1*/
/*eslint-env es6*/
import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const indexSnapshot = requirefrom('src/testUtils')('index_snapshot');
const ScenarioManager = requirefrom('src/testUtils')('scenario_manager');
import Migration from '../../migration_4';
import Scenario from './scenarios/migration_4/scenario';
const serverConfig = requirefrom('test')('serverConfig');
import url from 'url';

describe('kibi_core/migrations/functional', function () {

  let clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  let timeout = 60000;
  this.timeout(timeout);

  const fakeConfig = {
    get: sinon.stub()
  };

  let scenarioManager = new ScenarioManager(clusterUrl, timeout);
  let client = new elasticsearch.Client({
    host: clusterUrl,
    requestTimeout: timeout
  });

  async function snapshot(indexName) {
    return indexSnapshot(client, indexName);
  }

  describe('Migration 4 - Functional test', function () {
    let warningSpy;
    let configuration;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
    }));

    _.each([ '.kibi1', '.kibi3' ], indexName => {
      describe(`should update the relations - ${indexName}`, function () {
        beforeEach(() => {
          configuration = {
            config: fakeConfig,
            client: client,
            logger: {
              warning: sinon.spy(),
              info: sinon.spy()
            }
          };
          warningSpy = configuration.logger.warning;
          fakeConfig.get.withArgs('kibana.index').returns(indexName);
        });

        it('should count all upgradeable objects', wrapAsync(async () => {
          let migration = new Migration(configuration);
          let result = await migration.count();
          expect(result).to.be(1);
        }));

        it('should upgrade all upgradeable objects', wrapAsync(async () => {
          let before = await snapshot(indexName);
          let migration = new Migration(configuration);

          let result = await migration.upgrade();
          expect(result).to.be(1);

          let after = await snapshot(indexName);
          expect(before.size).to.equal(after.size);

          let upgradedDefinitions = 0;

          const areRelationsIdTheSame = function (originalId, upgradedId) {
            const originalIdParts = originalId.split('/');
            const upgradedIdParts = upgradedId.split('/');

            expect(originalIdParts).to.have.length(4);
            expect(upgradedIdParts).to.have.length(6);
            expect(upgradedIdParts[0]).to.be(originalIdParts[0]); // left index
            expect(upgradedIdParts[1]).to.be(''); // left type
            expect(upgradedIdParts[2]).to.be(originalIdParts[1]); // left path
            expect(upgradedIdParts[3]).to.be(originalIdParts[2]); // right index
            expect(upgradedIdParts[4]).to.be(''); // right type
            expect(upgradedIdParts[5]).to.be(originalIdParts[3]); // right path
          };

          const areIndicesRelationsTheSame = function (originalRelation, upgradedRelation) {
            expect(originalRelation).to.be.ok();
            expect(upgradedRelation).to.be.ok();
            expect(upgradedRelation.label).to.be(originalRelation.label);
            expect(upgradedRelation.indices).to.have.length(2);

            expect(Object.keys(upgradedRelation.indices[0])).to.have.length(3);
            expect(upgradedRelation.indices[0].indexPatternId).to.be(originalRelation.indices[0].indexPatternId);
            expect(upgradedRelation.indices[0].indexPatternType).to.be('');
            expect(originalRelation.indices[0].indexPatternType).to.be.an('undefined');
            expect(upgradedRelation.indices[0].path).to.be(originalRelation.indices[0].path);

            expect(Object.keys(upgradedRelation.indices[1])).to.have.length(3);
            expect(upgradedRelation.indices[1].indexPatternId).to.be(originalRelation.indices[1].indexPatternId);
            expect(upgradedRelation.indices[1].indexPatternType).to.be('');
            expect(originalRelation.indices[1].indexPatternType).to.be.an('undefined');
            expect(upgradedRelation.indices[1].path).to.be(originalRelation.indices[1].path);
            areRelationsIdTheSame(originalRelation.id, upgradedRelation.id);
          };

          for (const [id, original] of before) {
            const upgraded = after.get(id);
            const upgradedKibiRelations = JSON.parse(upgraded._source['kibi:relations']);
            const originalKibiRelations = JSON.parse(original._source['kibi:relations']);

            expect(upgradedKibiRelations).not.to.be.an('undefined');

            // the version field is new
            expect(Object.keys(upgradedKibiRelations).length - 1).to.be(Object.keys(originalKibiRelations).length);
            expect(Object.keys(upgradedKibiRelations.relationsIndices).length)
            .to.be(Object.keys(originalKibiRelations.relationsIndices).length);
            expect(Object.keys(upgradedKibiRelations.relationsDashboards).length)
            .to.be(Object.keys(originalKibiRelations.relationsDashboards).length);
            if (originalKibiRelations.relationsDashboardsSerialized) {
              expect(Object.keys(upgradedKibiRelations.relationsDashboardsSerialized).length)
              .to.be(Object.keys(originalKibiRelations.relationsDashboardsSerialized).length);
            } else {
              expect(upgradedKibiRelations.relationsDashboardsSerialized).to.not.be.ok();
            }
            expect(upgradedKibiRelations.relationsIndicesSerialized).to.eql(originalKibiRelations.relationsIndicesSerialized);

            // check indices relations
            _.each(originalKibiRelations.relationsIndices, (originalRelation, i) => {
              const upgradedRelation = upgradedKibiRelations.relationsIndices[i];
              areIndicesRelationsTheSame(originalRelation, upgradedRelation);
            });
            // check dashboards relations
            _.each(originalKibiRelations.relationsDashboards, (originalRelation, i) => {
              const upgradedRelation = upgradedKibiRelations.relationsDashboards[i];
              expect(upgradedRelation).to.be.ok();
              expect(Object.keys(upgradedRelation)).to.have.length(2);
              expect(upgradedRelation.dashboards).to.eql(originalRelation.dashboards);

              const originalIndicesRelation = _.find(originalKibiRelations.relationsIndices, 'id', originalRelation.relation);
              const upgradedIndicesRelation = _.find(upgradedKibiRelations.relationsIndices, 'id', upgradedRelation.relation);
              areIndicesRelationsTheSame(originalIndicesRelation, upgradedIndicesRelation);
            });
            // check dashboards relations serialized
            if (originalKibiRelations.relationsDashboardsSerialized) {
              expect(_.omit(upgradedKibiRelations.relationsDashboardsSerialized, 'links'))
              .to.eql(_.omit(originalKibiRelations.relationsDashboardsSerialized, 'links'));
              _.each(originalKibiRelations.relationsDashboardsSerialized.links, (originalRelation, i) => {
                const upgradedRelation = upgradedKibiRelations.relationsDashboardsSerialized.links[i];
                expect(_.omit(upgradedRelation, 'data')).to.eql(_.omit(originalRelation, 'data'));
                expect(Object.keys(upgradedRelation.data)).to.have.length(2);
                areRelationsIdTheSame(originalRelation.data.id, upgradedRelation.data.relation);
                const dashboardsRelations = _.find(upgradedKibiRelations.relationsDashboards, upgradedRelation.data);
                expect(dashboardsRelations).to.be.ok();
              });
            }

            expect(upgradedKibiRelations.version).to.equal(2);
            upgradedDefinitions++;
          }

          expect(upgradedDefinitions).to.be(1);

          expect(warningSpy.called).to.be(false);

          result = await migration.count();
          expect(result).to.be(0);
        }));
      });
    });

    describe('should not update the relations', function () {
      beforeEach(() => {
        configuration = {
          config: fakeConfig,
          client: client,
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        warningSpy = configuration.logger.warning;
        fakeConfig.get.withArgs('kibana.index').returns('.kibi2');
      });

      it('should count all upgradeable objects', wrapAsync(async () => {
        let migration = new Migration(configuration);
        let result = await migration.count();
        expect(result).to.be(0);
      }));
    });

    describe('should skip the migration if kibi:relations is empty', function () {
      beforeEach(() => {
        configuration = {
          config: fakeConfig,
          client: client,
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        warningSpy = configuration.logger.warning;
        fakeConfig.get.withArgs('kibana.index').returns('.kibi4');
      });

      it('should not find any object to upgrade', wrapAsync(async () => {
        let migration = new Migration(configuration);
        let result = await migration.count();
        expect(result).to.be(0);
      }));

      it('should not upgrade', wrapAsync(async () => {
        let migration = new Migration(configuration);
        let result = await migration.upgrade();
        expect(result).to.be(0);
      }));
    });

    afterEach(wrapAsync(async () => {
      await scenarioManager.unload(Scenario);
    }));

  });

});
