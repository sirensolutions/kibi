import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const indexSnapshot = requirefrom('src/testUtils')('index_snapshot');
const ScenarioManager = requirefrom('src/testUtils')('scenario_manager');
import Migration from '../../migration_3';
import Scenario from './scenarios/migration_3/scenario';
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

  describe('Migration 3 - Functional test', function () {
    let warningSpy;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
      warningSpy = sinon.spy(configuration.logger, 'warning');
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      let migration = new Migration(configuration);
      let result = await migration.count();
      expect(result).to.be(12);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      let before = await snapshot();
      let migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(12);

      let after = await snapshot();
      expect(before.size).to.equal(after.size);

      expect(before).to.eql(after);

      let unmodifiedIds = [
        'template-2',
        'query-2',
        'articles-sql-2',
        'data-table-2',
        'query-viewer-2'
      ];

      let upgradedDefinitions = 0;

      for (let [id, original] of before) {
        let upgraded = after.get(id);
        if (original._type !== 'visualization' || unmodifiedIds.indexOf(id) >= 0) {
          expect(original).to.eql(upgraded);
          continue;
        }

        let upgradedVisState = JSON.parse(upgraded._source.visState);
        let originalVisState = JSON.parse(original._source.visState);

        for (let key of Object.keys(originalVisState)) {

          if (key === 'aggs' && upgradedVisState.type === 'table') {
            for (let a = 0; a < originalVisState.aggs.length; a++) {
              let originalAgg = originalVisState.aggs[a];
              let upgradedAgg = upgradedVisState.aggs[a];

              expect(upgradedAgg).not.to.be.an('undefined');

              if (upgradedAgg.type === 'external_query_terms_filter') {
                if (originalAgg.params && originalAgg.params.queryIds) {
                  for (let q = 0; q < originalAgg.params.queryIds.length; q++) {
                    upgradedDefinitions++;
                    let originalQueryDef = originalAgg.params.queryIds[q];
                    let upgradedQueryDef = upgradedAgg.params.queryDefinitions[q];
                    expect(upgradedQueryDef.queryId).to.equal(originalQueryDef.id);
                    expect(upgradedQueryDef.joinElasticsearchField).to.equal(originalQueryDef.joinElasticsearchField);
                    expect(upgradedQueryDef.queryVariableName).to.equal(originalQueryDef.queryVariableName);
                    expect(Object.keys(upgradedQueryDef).length).to.be(3);
                  }
                }
                expect(upgradedAgg.params.queryIds).to.be.an('undefined');
                expect(upgradedAgg.params.queryDefinitions).not.to.be.an('undefined');
                expect(upgradedAgg.version).to.equal(2);
              } else {
                expect(originalAgg).to.eql(upgradedAgg);
              }
            }
            continue;
          }

          if (key === 'params' && upgradedVisState.type === 'kibi-data-table') {

            expect(upgradedVisState.params.queryIds).to.be.an('undefined');
            expect(upgradedVisState.params.queryDefinitions).not.to.be.an('undefined');

            for (let param of Object.keys(originalVisState.params)) {
              let originalParam = originalVisState.params[param];

              let upgradedParam = upgradedVisState.params[param];
              if (param === 'queryIds') {
                upgradedParam = upgradedVisState.params.queryDefinitions;
                for (let q = 0; q < originalParam.length; q++) {
                  upgradedDefinitions++;
                  let originalQueryDef = originalParam[q];
                  let upgradedQueryDef = upgradedParam[q];
                  expect(upgradedQueryDef.queryId).to.equal(originalQueryDef.id);
                  expect(upgradedQueryDef.queryVariableName).to.equal(originalQueryDef.queryVariableName);
                  expect(Object.keys(upgradedQueryDef).length).to.be(2);
                }
              }
              else if (param === 'hasEntityDependentQuery') {
                expect(upgradedParam).to.be.an('undefined');
              } else {
                expect(upgradedParam).to.eql(originalParam);
              }
            }
            continue;
          }

          if (key === 'params' && upgradedVisState.type === 'kibiqueryviewervis') {

            expect(upgradedVisState.params.queryOptions).to.be.an('undefined');
            expect(upgradedVisState.params.queryDefinitions).not.to.be.an('undefined');

            for (let param of Object.keys(originalVisState.params)) {
              let originalParam = originalVisState.params[param];

              let upgradedParam = upgradedVisState.params[param];
              if (param === 'queryOptions') {
                upgradedParam = upgradedVisState.params.queryDefinitions;
                for (let q = 0; q < originalParam.length; q++) {
                  upgradedDefinitions++;
                  let originalQueryDef = originalParam[q];
                  let upgradedQueryDef = upgradedParam[q];

                  for (let key of Object.keys(originalQueryDef)) {
                    if (key === 'isEntityDependent') {
                      expect(upgradedQueryDef[key]).to.be.an('undefined');
                      continue;
                    }
                    expect(upgradedQueryDef[key]).to.eql(originalQueryDef[key]);
                  }
                }
              } else if (param === 'hasEntityDependentQuery') {
                expect(upgradedParam).to.be.an('undefined');
              } else {
                expect(upgradedParam).to.eql(originalParam);
              }
            }
            continue;
          }

          expect(upgradedVisState[key]).to.eql(originalVisState[key]);
        }

        if (upgradedVisState.type === 'kibi-data-table' || upgradedVisState.type === 'kibiqueryviewervis') {
          expect(upgradedVisState.version).to.be(2);
        }
      }

      expect(upgradedDefinitions).to.be(4);

      expect(warningSpy.callCount).to.be(3);

      result = await migration.count();
      expect(result).to.be(0);
    }));

    afterEach(wrapAsync(async () => {
      await scenarioManager.unload(Scenario);
      configuration.logger.warning.restore();
    }));

  });

});

