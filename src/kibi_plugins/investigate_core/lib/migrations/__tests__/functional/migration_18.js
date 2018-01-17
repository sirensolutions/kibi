/*eslint no-loop-func: 1*/
/*eslint-env es6*/
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_18';
import Scenario1 from './scenarios/migration_18/scenario1';
import Scenario2 from './scenarios/migration_18/scenario2';
import Scenario3 from './scenarios/migration_18/scenario3';
import url from 'url';

const serverConfig = requirefrom('test')('server_config');
const wrapAsync = requirefrom('src/test_utils')('wrap_async');
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

  async function snapshot() {
    return indexSnapshot(cluster, '.siren');
  }

  describe('Investigate Core - Migration 18 - Functional test', function () {
    let warningSpy;
    let configuration;

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
      fakeConfig.get.withArgs('kibana.index').returns('.siren');
    });

    describe('should update the kibi:* advanced settings to siren:*', function () {
      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario1);
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario1);
      }));

      it('should count all upgradeable objects', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(2);
      }));

      it('should upgrade all upgradeable objects', wrapAsync(async () => {
        const before = await snapshot('.siren');
        const migration = new Migration(configuration);

        let result = await migration.upgrade();
        expect(result).to.be(2);

        const after = await snapshot('.siren');
        expect(before.size).to.equal(after.size);

        expect(warningSpy.called).to.be(false);

        const afterSource = after.get('siren')._source;
        const beforeSource = before.get('siren')._source;

        expect(afterSource).to.not.have.property('kibi:relations');
        expect(afterSource).to.not.have.property('kibi:enableAllDashboardsCounts');
        expect(afterSource).to.have.property('siren:relations');
        expect(afterSource).to.have.property('siren:enableAllDashboardsCounts');
        expect(afterSource['siren:relations']).to.equal(beforeSource['kibi:relations']);
        expect(afterSource['siren:enableAllDashboardsCounts']).to.equal(beforeSource['kibi:enableAllDashboardsCounts']);
        result = await migration.count();
        expect(result).to.be(0);
      }));
    });
    describe(`should remove any kibi: prefixed settings that were deprecated`, function () {
      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario3);
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario3);
      }));

      it('should count all upgradeable objects', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(2);
      }));

      it('should upgrade all upgradeable objects', wrapAsync(async () => {
        const before = await snapshot('.siren');
        const migration = new Migration(configuration);

        let result = await migration.upgrade();
        expect(result).to.be(2);

        const after = await snapshot('.siren');
        expect(before.size).to.equal(after.size);

        expect(warningSpy.called).to.be(false);

        const afterSource = after.get('siren')._source;
        const beforeSource = before.get('siren')._source;

        expect(afterSource).to.have.property('siren:relations');
        expect(afterSource).to.have.property('siren:enableAllDashboardsCounts');
        expect(afterSource).to.not.have.property('kibi:joinLimit');
        expect(afterSource).to.not.have.property('kibi:deprecated');
        result = await migration.count();
        expect(result).to.be(0);
      }));
    });
    describe('should not change other keys', function () {
      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario2);
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario2);
      }));

      it('should not find any object to upgrade', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      }));

      it('should not upgrade', wrapAsync(async () => {
        const before = await snapshot('.siren');
        const migration = new Migration(configuration);
        const result = await migration.upgrade();
        const after = await snapshot('.siren');

        expect(result).to.be(0);

        expect(before.get('siren')).to.eql(after.get('siren'));
      }));
    });
  });
});
