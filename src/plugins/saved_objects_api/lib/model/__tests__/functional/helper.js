import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import url from 'url';
import ConflictError from '../../errors/conflict';
const indexSnapshot = requirefrom('src/testUtils')('index_snapshot');
const ScenarioManager = requirefrom('src/testUtils')('scenario_manager');
const serverConfig = requirefrom('test')('serverConfig');

/**
 * Provides common methods to test Model instances.
 */
export default class ModelTestHelper {

  /**
   * Creates a new ModelTestHelper.
   *
   * @param {Number} timeout - Timeout for all network operations.
   * @param {Class} ModelClass - The model class being tested.
   * @param {String} typename - The name of the ES type managed the the model class being tested.
   * @param {String} stringField - The name of a stringField in the mapping that will be set during tests.
   * @param {String} prefix - The prefix for objects created by the helper.
   */
  constructor(timeout, ModelClass, typename, stringField, prefix) {
    const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
    this._prefix = prefix;
    this._stringField = stringField;

    this._modelClass = ModelClass;
    this._typename = typename;

    this._scenarioManager = new ScenarioManager(clusterUrl, timeout);
    this._client = new elasticsearch.Client({
      host: clusterUrl,
      requestTimeout: timeout
    });
    this._server = {
      plugins: {
        elasticsearch: {
          client: this._client
        }
      },
      config: () => ({
        get: (key) => {
          if (key === 'kibana.index') {
            return '.kibi';
          }
          throw new Error(`Unknown configuration key: ${key}`);
        }
      })
    };
  }

  /**
   * Returns the Elasticsearch client used by the helper.
   */
  get client() {
    return this._client;
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
    return await indexSnapshot(this._client, '.kibi');
  }

  /**
   * Returns the mappings in the .kibi index for the specified.type.
   */
  async getMappings(type) {
    return await this._client.indices.getMapping({
      index: '.kibi',
      type: type
    });
  }

  /**
   * Returns an instance of the model class being tested.
   */
  getInstance() {
    return new this._modelClass(this._server);
  }

  /**
   * Tests the creation of a new object through the specified model class.
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
    const mappingsBefore = await this.getMappings(this._typename);
    expect(mappingsBefore).to.eql({});

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
    const mappingsBefore = await this.getMappings(this._typename);
    expect(mappingsBefore).to.eql({});

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
    const putMappingSpy = sinon.spy(this._client.indices, 'putMapping');
    try {

      await this._client.indices.putMapping({
        index: '.kibi',
        type: this._typename,
        body: {
          properties: {
            string: {
              type: 'string'
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

      expect(putMappingSpy.calledOnce).to.be(true);
      expect(index.get(id)._source[this._stringField]).to.be('1');

      const expectedMapping = {
        string: {
          type: 'string'
        }
      };
      expectedMapping[this._stringField] = {
        type: 'string'
      };
      expect(mappingsAfter['.kibi'].mappings[this._typename].properties).to.eql(expectedMapping);
    } finally {
      putMappingSpy.restore();
    }
  }

}
