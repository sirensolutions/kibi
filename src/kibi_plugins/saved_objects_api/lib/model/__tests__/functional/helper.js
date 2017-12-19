import expect from 'expect.js';
import { merge } from 'lodash';
import sinon from 'sinon';
import url from 'url';
import initRegistry from '../../../init_registry';
import ConflictError from '../../errors/conflict';
import requirefrom from 'requirefrom';

const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const serverConfig = requirefrom('test')('server_config');

/**
 * Provides common methods to test Model instances.
 */
export default class ModelTestHelper {

  /**
   * Creates a new ModelTestHelper.
   *
   * @param {Number} timeout - Timeout for all network operations.
   * @param {String} typename - The name of the ES type managed the the model class being tested.
   * @param {String} stringField - The name of a stringField in the mapping that will be set during tests.
   * @param {String} prefix - The prefix for objects created by the helper.
   * @param {Array} plugins - Mocked server plugins.
   */
  constructor(timeout, typename, stringField, prefix, plugins) {
    const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
    this._prefix = prefix;
    this._stringField = stringField;

    this._typename = typename;

    this._scenarioManager = new ScenarioManager(clusterUrl, timeout);
    this._cluster = new Cluster({
      url: clusterUrl,
      ssl: { verificationMode: 'none' },
      requestTimeout: timeout
    });

    const configMock = {
      get: (key) => {
        if (key === 'kibana.index') {
          return '.kibi';
        }
        throw new Error(`Unknown configuration key: ${key}`);
      }
    };

    this._server = {
      plugins: {
        elasticsearch: {
          getCluster: () => this._cluster
        },
        kibi_query_engine: {
          getCryptoHelper: () => ({
            encryptDatasourceParams: () => {}
          })
        },
        saved_objects_api: {
          getMiddlewares: () => []
        }
      },
      config: () => configMock
    };

    if (plugins) {
      merge(this._server.plugins, plugins);
    }
    this._registry = initRegistry(this._server);
  }

  /**
   * Returns the Elasticsearch fake server used by the helper.
   */
  get server() {
    return this._server;
  }

  /**
   * Returns an instance of the admin cluster used by the model class being tested.
   */
  getCluster() {
    return this._cluster;
  }

  /**
   * Reloads specified scenario.
   *
   * @param {Object} scenario - The scenario to reload.
   */
  async reload(scenario) {
    await this._scenarioManager.reload(scenario);
  }

  /**
   * Returns a snapshot of the .kibi index.
   */
  async snapshot() {
    return await indexSnapshot(this._cluster, '.kibi');
  }

  /**
   * Returns the mappings in the .kibi index for the specified.type.
   */
  async getMappings(type) {
    return await this._cluster.callWithInternalUser('indices.getMapping', {
      index: '.kibi',
      type: type
    });
  }

  /**
   * Returns an instance of the model class being tested.
   */
  getInstance() {
    return this._registry.get(this._typename);
  }

  /**
   * Tests the creation of a new object through the specified model class.
   *
   * @param request - An optional HAPI request mock.
   */
  async testCreation() {
    const id = `${this._prefix}1`;
    const model = this.getInstance();
    const body = {};
    body[this._stringField] = '1';
    await model.create(id, body);
    try {
      const index = await this.snapshot();
      expect(index.get(id)._source[this._stringField]).to.be('1');
      await model.create(id, body);
      expect().fail(`${this._modelClass.constructor.name} did not throw a ConflictError`);
    } catch (error) {
      expect(error).to.be.a(ConflictError);
    }
  }

  /**
   * Tests indexing of multiple objects through the specified model class.
   */
  async testIndexing() {
    const id1 = `${this._prefix}1`;
    const id2 = `${this._prefix}2`;
    const body1 = {};
    body1[this._stringField] = '1';
    const body2 = {};
    body2[this._stringField] = '2';

    const model = this.getInstance();
    await model.update(id1, body1);
    await model.update(id1, body2);
    await model.update(id2, body1);
    const index = await this.snapshot();
    expect(index.get(id1)._source[this._stringField]).to.be('2');
    expect(index.get(id2)._source[this._stringField]).to.be('1');
  }

  /**
   * Tests the mapping created by the model class when creating an object against the @expectedMapping.
   */
  async testMappingsCreation(expectedMapping) {
    let mappingsErrorBefore;
    try {
      await this.getMappings(this._typename);
    } catch (e) {
      mappingsErrorBefore = e;
    }

    expect(mappingsErrorBefore.status).to.eql(404);
    expect(mappingsErrorBefore.displayName).to.eql('NotFound');

    const model = this.getInstance();
    const id = `${this._prefix}1`;
    const body = {};
    body[this._stringField] = '1';
    await model.create(id, body);

    const index = await this.snapshot();
    const mappingsAfter = await this.getMappings(this._typename);

    expect(index.get(id)._source[this._stringField]).to.be('1');
    expect(mappingsAfter['.kibi'].mappings[this._typename].properties).to.eql(expectedMapping);
  }

  /**
   * Tests the mapping created by the model class when indexing an object against the @expectedMapping.
   */
  async testMappingsIndexing(expectedMapping) {
    let mappingsErrorBefore;
    try {
      await this.getMappings(this._typename);
    } catch (e) {
      mappingsErrorBefore = e;
    }

    expect(mappingsErrorBefore.status).to.eql(404);
    expect(mappingsErrorBefore.displayName).to.eql('NotFound');

    const model = this.getInstance();
    const id = `${this._prefix}1`;
    const body = {};
    body[this._stringField] = '1';
    await model.update(id, body);

    const index = await this.snapshot();
    const mappingsAfter = await this.getMappings(this._typename);

    expect(index.get(id)._source[this._stringField]).to.be('1');
    expect(mappingsAfter['.kibi'].mappings[this._typename].properties).to.eql(expectedMapping);
  }

  /**
   * Tests that mappings are not created if they already exists for the type managed by the model class being tested.
   */
  async testSkipMappings() {
    const callWithInternalUserMapping = sinon.spy(this._cluster, 'callWithInternalUser');
    try {
      await this._cluster.callWithInternalUser('indices.putMapping', {
        index: '.kibi',
        type: this._typename,
        body: {
          properties: {
            string: {
              type: 'text'
            }
          }
        }
      });

      const id = `${this._prefix}1`;
      const body = {};
      body[this._stringField] = '1';
      const model = this.getInstance();
      await model.create(id, body);

      const index = await this.snapshot();
      const mappingsAfter = await this.getMappings(this._typename);

      expect(callWithInternalUserMapping.withArgs('indices.putMapping').calledOnce).to.be(true);
      expect(index.get(id)._source[this._stringField]).to.be('1');

      const expectedMapping = {
        string: {
          type: 'text'
        }
      };
      expectedMapping[this._stringField] = {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      };
      expect(mappingsAfter['.kibi'].mappings[this._typename].properties).to.eql(expectedMapping);
    } finally {
      callWithInternalUserMapping.restore();
    }
  }

}
