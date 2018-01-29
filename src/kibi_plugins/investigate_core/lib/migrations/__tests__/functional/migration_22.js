/*eslint no-loop-func: 1*/
/*eslint-env es6*/
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_22';
import Scenario from './scenarios/migration_22/scenario';
import url from 'url';
import { esTestConfig } from '../../../../../../test_utils/es';

const serverConfig = requirefrom('test')('server_config');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');

describe('investigate_core/migrations/functional', function () {

  const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const fakeConfig = {
    get: sinon.stub(),
    has: sinon.stub()
  };

  const fakeServer = {
    config: () => { return fakeConfig; },
    plugins: {
      elasticsearch: {
        getCluster: () => {
          return {
            callWithInternalUser: sinon.stub()
          };
        }
      }
    },
    log: (message, msg) => {
      // just print every log in case we have problems during tests.
      console.log(message + ' - ' + msg);
    }
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

  const checkConfigWasUpgraded = function (original, upgraded) {
    expect(original._source['siren:relations']).to.not.be(undefined);
    expect(upgraded._source['siren:relations']).to.be(undefined);
  };

  describe('Investigate Core - Migration 22 - Functional test', function () {
    let warningSpy;
    let configuration;

    beforeEach(async () => {
      await scenarioManager.reload(Scenario);
    });

    describe('relational schema migration', function () {
      const indexName = '.siren1';

      beforeEach(() => {
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          server: fakeServer,
          logger: {
            warning: sinon.spy(),
            info: sinon.spy(),
            error: sinon.spy()
          }
        };
        const esUrlParts = esTestConfig.getUrlParts();
        const elasticUrl = esUrlParts.protocol + '://' + esUrlParts.hostname + ':' + esUrlParts.port;
        warningSpy = configuration.logger.warning;
        fakeConfig.has.withArgs('kibana.index').returns(true);
        fakeConfig.get.withArgs('kibana.index').returns(indexName);
        fakeConfig.get.withArgs('investigate_core.gremlin_server.url').returns('http://127.0.0.1:8062');
        fakeConfig.has.withArgs('investigate_core.gremlin_server.path').returns(true);
        fakeConfig.get.withArgs('investigate_core.gremlin_server.path').returns('gremlin_server/gremlin-server.jar');
        fakeConfig.has.withArgs('elasticsearch.url').returns(true);
        fakeConfig.get.withArgs('elasticsearch.url').returns(elasticUrl);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(1);
      });

      it('should upgrade all upgradeable objects', async () => {
        const before = await snapshot(indexName);
        const migration = new Migration(configuration);

        let result = await migration.upgrade();
        expect(result).to.be(1);

        const after = await snapshot(indexName);
        // here we should have the new ontology-model object indexed
        expect(before.size).to.not.equal(after.size);

        // check that the siren.relations field is not there anymore
        const originalConfig = before.get('siren');
        const upgradedConfig = after.get('siren');
        checkConfigWasUpgraded(originalConfig, upgradedConfig);

        // check that now we have the ontology-model document
        const originalOntology = before.get('default-ontology');
        expect(originalOntology).to.be(undefined);
        const upgradedOntology = after.get('default-ontology');
        expect(upgradedOntology).to.not.be(undefined);

        expect(warningSpy.called).to.be(false);

        result = await migration.count();
        expect(result).to.be(0);
      });
    });

    describe('no schema to migrate', function () {
      const indexName = '.siren2';

      beforeEach(() => {
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy(),
            error: sinon.spy()
          }
        };
        warningSpy = configuration.logger.warning;
        fakeConfig.get.withArgs('kibana.index').returns(indexName);
      });

      it('should count all upgradeable objects', async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
        expect(warningSpy.called).to.be(false);
      });
    });

    afterEach(async () => {
      await scenarioManager.unload(Scenario);
    });

  });

});
