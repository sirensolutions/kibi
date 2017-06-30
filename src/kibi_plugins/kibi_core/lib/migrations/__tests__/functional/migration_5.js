import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';
import requirefrom from 'requirefrom';

import Migration from '../../migration_5';
import Scenario1 from './scenarios/migration_5/scenario1';
import Scenario2 from './scenarios/migration_5/scenario2';
import Scenario3 from './scenarios/migration_5/scenario3';
import Scenario4 from './scenarios/migration_5/scenario4';
import Scenario5 from './scenarios/migration_5/scenario5';
import Scenario6 from './scenarios/migration_5/scenario6';
import Scenario7 from './scenarios/migration_5/scenario7';

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

  async function snapshot() {
    return indexSnapshot(cluster, '.kibi');
  }
  describe('Migration 5 - Functional test', function () {
    let warningSpy;
    let configuration;

    describe('should not update anything', function () {

      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario5);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        warningSpy = configuration.logger.warning;
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario5);
      }));

      it('should count all upgradeable objects', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      }));

    });

    _.each([
      {
        label: 'Scenario1',
        Scenario: Scenario1,
        expectedNewRelations: 0
      },
      {
        label: 'Scenario2',
        Scenario: Scenario2,
        expectedNewRelations: 0
      },
      {
        label: 'Scenario3',
        Scenario: Scenario3,
        expectedNewRelations: 1
      },
      {
        label: 'Scenario4',
        Scenario: Scenario4,
        expectedNewRelations: 3
      },
      {
        // should support visualizations with wildcard index patterns
        label: 'Scenario6',
        Scenario: Scenario6,
        expectedNewRelations: 0
      },
      {
        // should support visualizations which reference non-existing indices
        label: 'Scenario7',
        Scenario: Scenario7,
        expectedNewRelations: 0,
        expectedWarning: 'No concrete index matches the patterns art* and company'
      }
    ], ({ label, Scenario, expectedNewRelations, expectedWarning }) => {
      describe(`should update the kibi sequential filter - ${label}`, function () {

        beforeEach(wrapAsync(async () => {
          await scenarioManager.reload(Scenario);
          configuration = {
            config: fakeConfig,
            client: cluster.getClient(),
            logger: {
              warning: sinon.spy(),
              info: sinon.spy()
            }
          };
          warningSpy = configuration.logger.warning;
        }));

        afterEach(wrapAsync(async () => {
          await scenarioManager.unload(Scenario);
        }));

        it('should count all upgradeable objects', wrapAsync(async () => {
          const migration = new Migration(configuration);
          const result = await migration.count();
          expect(result).to.be(1);
        }));

        it('should upgrade all upgradeable objects', wrapAsync(async () => {
          const before = await snapshot();
          const migration = new Migration(configuration);

          let result = await migration.upgrade();
          expect(result).to.be(1);

          const after = await snapshot();
          expect(before.size).to.equal(after.size);

          // get the relations
          const originalRelations = JSON.parse(before.get('kibi')._source['kibi:relations']);
          const upgradedRelations = JSON.parse(after.get('kibi')._source['kibi:relations']);

          const original = before.get('buttons');
          const upgraded = after.get('buttons');
          const originalVisState = JSON.parse(original._source.visState);
          const upgradedVisState = JSON.parse(upgraded._source.visState);

          expect(upgradedVisState).not.to.be.an('undefined');

          let actualNewRelations = 0;

          const SEPARATOR = '/';
          expect(upgradedVisState.params.buttons.length).to.be(originalVisState.params.buttons.length);
          for (let i = 0; i < originalVisState.params.buttons.length; i++) {
            const originalButton = originalVisState.params.buttons[i];
            const upgradedButton = upgradedVisState.params.buttons[i];

            expect(upgradedButton.filterLabel).to.be(originalButton.filterLabel);
            expect(upgradedButton.label).to.be(originalButton.label);
            expect(upgradedButton.targetDashboardId).to.be(originalButton.redirectToDashboard);
            expect(upgradedButton.sourceDashboardId).to.not.be.ok();

            const [ leftIndex, leftType, leftPath, rightIndex, rightType, rightPath ] = upgradedButton.indexRelationId.split(SEPARATOR);
            let left = [
              originalButton.sourceIndexPatternId,
              originalButton.sourceIndexPatternType,
              originalButton.sourceField
            ];
            let right = [
              originalButton.targetIndexPatternId,
              originalButton.targetIndexPatternType,
              originalButton.targetField
            ];
            if (left.join(SEPARATOR) > right.join(SEPARATOR)) {
              const tmp = left;
              left = right;
              right = tmp;
            }
            expect(leftIndex).to.be(left[0]);
            expect(leftPath).to.be(left[2]);
            expect(rightIndex).to.be(right[0]);
            expect(rightPath).to.be(right[2]);

            const types = await migration._getTypes([ originalButton.sourceIndexPatternId, originalButton.targetIndexPatternId ]);
            // only check the types if an index has more than one
            if (types.length > 2) {
              expect(rightType).to.be(right[1]);
              expect(leftType).to.be(left[1]);
            }

            const relation = _.find(upgradedRelations.relationsIndices, 'id', upgradedButton.indexRelationId);
            expect(relation).to.be.ok();
            if (!_.find(originalRelations.relationsIndices, 'id', upgradedButton.indexRelationId)) {
              actualNewRelations++;
            }
          };

          expect(actualNewRelations).to.be(expectedNewRelations);

          expect(upgradedVisState.version).to.equal(2);

          if (expectedWarning) {
            sinon.assert.calledOnce(warningSpy);
            sinon.assert.calledWith(warningSpy, expectedWarning);
          } else {
            sinon.assert.notCalled(warningSpy);
          }

          result = await migration.count();
          expect(result).to.be(0);
        }));
      });
    });
  });

});
