import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import url from 'url';
import ConflictError from '../../errors/conflict';
import Scenario from './scenarios/empty/scenario';
import VisualizationModel from '../../visualization';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const indexSnapshot = requirefrom('src/testUtils')('index_snapshot');
const ScenarioManager = requirefrom('src/testUtils')('scenario_manager');
const serverConfig = requirefrom('test')('serverConfig');

describe('saved_objects_api/functional', function () {

  let clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  let timeout = 60000;
  this.timeout(timeout);

  let scenarioManager = new ScenarioManager(clusterUrl, timeout);
  let client = new elasticsearch.Client({
    host: clusterUrl,
    requestTimeout: timeout
  });
  let server = {
    plugins: {
      elasticsearch: {
        client: client
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

  /**
   * Returns a snapshot of the .kibi index.
   */
  async function snapshot() {
    return indexSnapshot(client, '.kibi');
  }

  /**
   * Returns the mappings in the .kibi index for the specified.type.
   */
  async function getMappings(type) {
    return await client.indices.getMapping({
      index: '.kibi',
      type: type
    });
  }

  describe('VisualizationModel', function () {
    let putMappingSpy = sinon.spy(client.indices, 'putMapping');

    const mappingProperties = {
      description: {
        type: 'string'
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'string'
          }
        }
      },
      title: {
        type: 'string'
      },
      savedSearchId: {
        type: 'string'
      },
      visState: {
        type: 'string'
      },
      uiStateJSON: {
        type: 'string'
      },
      version: {
        type: 'integer'
      }
    };

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
    }));

    it('should throw a ConflictError on creation conflicts.', wrapAsync(async () => {
      const model = new VisualizationModel(server);
      await model.create('vis1', {'version': 1});
      try {
        const index = await snapshot();
        expect(index.get('vis1')._source.version).to.be(1);
        await model.create('vis1', {'version': 1});
        expect().fail('VisualizationModel did not throw a ConflictError');
      } catch (error) {
        expect(error).to.be.a(ConflictError);
      }
    }));

    it('should index a visualization correctly.', wrapAsync(async () => {
      const model = new VisualizationModel(server);
      await model.update('vis1', {'version': 1});
      await model.update('vis1', {'version': 2});
      await model.update('vis2', {'version': 1});
      let index = await snapshot();
      expect(index.get('vis1')._source.version).to.be(2);
      expect(index.get('vis2')._source.version).to.be(1);
    }));

    it('should create mappings when creating a visualization if they do not exist.', wrapAsync(async () => {
      const mappingsBefore = await getMappings('visualization');
      expect(mappingsBefore).to.eql({});

      const model = new VisualizationModel(server);
      await model.create('vis1', {'version': 1});

      const index = await snapshot();
      const mappingsAfter = await getMappings('visualization');

      expect(index.get('vis1')._source.version).to.be(1);
      expect(mappingsAfter['.kibi'].mappings.visualization.properties).to.eql(mappingProperties);
    }));

    it('should not create mappings when creating a visualization if they already exist.', wrapAsync(async () => {

      await client.indices.putMapping({
        index: '.kibi',
        type: 'visualization',
        body: {
          properties: {
            string: {
              type: 'string'
            }
          }
        }
      });

      const model = new VisualizationModel(server);
      const visualization = await model.create('vis1', {'version': 1});

      const index = await snapshot();
      const mappingsAfter = await getMappings('visualization');

      expect(putMappingSpy.calledOnce).to.be(true);
      expect(index.get('vis1')._source.version).to.be(1);
      expect(mappingsAfter['.kibi'].mappings.visualization.properties).to.eql({
        string: {
          type: 'string'
        },
        version: {
          type: 'long'
        }
      });
    }));

    afterEach(wrapAsync(async () => {
      await scenarioManager.unload(Scenario);
      putMappingSpy.restore();
    }));

  });

});
