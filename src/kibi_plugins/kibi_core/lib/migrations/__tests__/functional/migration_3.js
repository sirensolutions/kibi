import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_3';
import Scenario from './scenarios/migration_3/scenario';
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
    ssl: { verificationMode: 'none' },
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

  describe('Migration 3 - Functional test', function () {
    let warningSpy;

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
      warningSpy = sinon.spy(configuration.logger, 'warning');
    }));

    it('should count all upgradeable objects', wrapAsync(async () => {
      const migration = new Migration(configuration);
      const result = await migration.count();
      expect(result).to.be(12);
    }));

    it('should upgrade all upgradeable objects', wrapAsync(async () => {
      const before = await snapshot();
      const migration = new Migration(configuration);

      let result = await migration.upgrade();
      expect(result).to.be(12);

      const after = await snapshot();
      expect(before.size).to.equal(after.size);

      expect(before).to.eql(after);

      const unmodifiedIds = [
        'template-2',
        'query-2',
        'articles-sql-2',
        'data-table-2',
        'query-viewer-2'
      ];

      let upgradedDefinitions = 0;

      for (const [id, original] of before) {
        const upgraded = after.get(id);
        if (original._type !== 'visualization' || unmodifiedIds.indexOf(id) >= 0) {
          expect(original).to.eql(upgraded);
          continue;
        }

        const upgradedVisState = JSON.parse(upgraded._source.visState);
        const originalVisState = JSON.parse(original._source.visState);

        for (const key of Object.keys(originalVisState)) {

          if (key === 'aggs' && upgradedVisState.type === 'table') {
            for (let a = 0; a < originalVisState.aggs.length; a++) {
              const originalAgg = originalVisState.aggs[a];
              const upgradedAgg = upgradedVisState.aggs[a];

              expect(upgradedAgg).not.to.be.an('undefined');

              if (upgradedAgg.type === 'external_query_terms_filter') {
                if (originalAgg.params && originalAgg.params.queryIds) {
                  for (let q = 0; q < originalAgg.params.queryIds.length; q++) {
                    upgradedDefinitions++;
                    const originalQueryDef = originalAgg.params.queryIds[q];
                    const upgradedQueryDef = upgradedAgg.params.queryDefinitions[q];
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

            for (const param of Object.keys(originalVisState.params)) {
              const originalParam = originalVisState.params[param];

              let upgradedParam = upgradedVisState.params[param];
              if (param === 'queryIds') {
                upgradedParam = upgradedVisState.params.queryDefinitions;
                for (let q = 0; q < originalParam.length; q++) {
                  upgradedDefinitions++;
                  const originalQueryDef = originalParam[q];
                  const upgradedQueryDef = upgradedParam[q];
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

            for (const param of Object.keys(originalVisState.params)) {
              const originalParam = originalVisState.params[param];

              let upgradedParam = upgradedVisState.params[param];
              if (param === 'queryOptions') {
                upgradedParam = upgradedVisState.params.queryDefinitions;
                for (let q = 0; q < originalParam.length; q++) {
                  upgradedDefinitions++;
                  const originalQueryDef = originalParam[q];
                  const upgradedQueryDef = upgradedParam[q];

                  for (const key of Object.keys(originalQueryDef)) {
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

