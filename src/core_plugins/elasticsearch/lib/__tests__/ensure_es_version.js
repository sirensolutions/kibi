import _ from 'lodash';
import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';
import SetupError from '../setup_error';
import semver from 'semver';
import { pkg } from '../../../../utils';
import { esTestConfig } from '../../../../test_utils/es';
import { ensureEsVersion } from '../ensure_es_version';

describe('plugins/elasticsearch', () => {
  describe('lib/ensure_es_version', () => {
    const compatibleEsVersions = pkg.compatible_es_versions;
    const KIBI_VERSION = compatibleEsVersions[0]; // kibi: added KIBI_VERSION to all tests
    let server;

    beforeEach(function () {
      server = {
        log: sinon.stub(),
        // This is required or else we get a SetupError.
        config: () => ({
          get: sinon.stub(),
        }),
        plugins: {
          elasticsearch: {
            getCluster: sinon.stub().withArgs('admin').returns({ callWithInternalUser: sinon.stub() }),
            status: {
              red: sinon.stub()
            },
            url: esTestConfig.getUrl()
          }
        }
      };
    });

    function setNodes(/* ...versions */) {
      const versions = _.shuffle(arguments);
      const nodes = {};
      let i = 0;

      while (versions.length) {
        const name = 'node-' + (++i);
        const version = versions.shift();

        const node = {
          version: version,
          http: {
            publish_address: 'http_address',
          },
          ip: 'ip'
        };

        if (!_.isString(version)) _.assign(node, version);
        nodes[name] = node;
      }

      const cluster = server.plugins.elasticsearch.getCluster('admin');
      cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any).returns(Promise.resolve({ nodes: nodes }));
    }

    function setNodeWithoutHTTP(version) {
      const nodes = { 'node-without-http': { version, ip: 'ip' } };
      const cluster = server.plugins.elasticsearch.getCluster('admin');
      cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any).returns(Promise.resolve({ nodes: nodes }));
    }

    function getPatchVersionOneLowerThanLowestCompatibleVersion(compatibleVersions) {
      const firstVersionMajor = semver.major(compatibleVersions[0]);
      const firstVersionMinor = semver.minor(compatibleVersions[0]);
      const firstVersionPatch = semver.patch(compatibleVersions[0]);
      return `${firstVersionMajor}.${firstVersionMinor}.${firstVersionPatch - 1}`;
    }

    it('returns true with single a node that matches', async () => {
      setNodes(compatibleEsVersions[0]);
      const result = await ensureEsVersion(server, KIBI_VERSION);
      expect(result).to.be(true);
    });

    it('returns true with multiple nodes that satisfy', async () => {
      setNodes(...compatibleEsVersions);
      const result = await ensureEsVersion(server, KIBI_VERSION);
      expect(result).to.be(true);
    });

    it('throws an error with a single node that is out of date', async () => {
      // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.

      const compatibleEsVersionsClone = compatibleEsVersions.slice(0);
      compatibleEsVersionsClone.unshift(getPatchVersionOneLowerThanLowestCompatibleVersion(compatibleEsVersionsClone));
      setNodes(...compatibleEsVersionsClone);
      try {
        await ensureEsVersion(server, KIBI_VERSION);
      } catch (e) {
        expect(e).to.be.a(SetupError);
      }
    });

    it('fails if that single node is a client node', async () => {
      const cloneOfCompatibleNodes = compatibleEsVersions.slice(0);
      const lastVersion = cloneOfCompatibleNodes[cloneOfCompatibleNodes.length - 1];
      cloneOfCompatibleNodes[cloneOfCompatibleNodes.length - 1] = {
        version: lastVersion,
        attributes: { client: true }
      };

      setNodes(...cloneOfCompatibleNodes);
      try {
        await ensureEsVersion(server, KIBI_VERSION);
      } catch (e) {
        expect(e).to.be.a(SetupError);
      }
    });

    it('errors if a node incompatible and without http publish address', async () => {
      setNodeWithoutHTTP(getPatchVersionOneLowerThanLowestCompatibleVersion(compatibleEsVersions));
      try {
        await ensureEsVersion(server, KIBI_VERSION);
      } catch (e) {
        expect(e.message).to.contain('incompatible nodes');
        expect(e).to.be.a(Error);
      }
    });
  });
});
