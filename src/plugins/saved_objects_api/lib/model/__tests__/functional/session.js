import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import url from 'url';
import ConflictError from '../../errors/conflict';
import NotFoundError from '../../errors/not_found';
import Scenario from './scenarios/empty/scenario';
import SessionModel from '../../session';
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

  describe('SessionModel', function () {
    let putMappingSpy = sinon.spy(client.indices, 'putMapping');

    const sessionMappingProperties = {
      description: {
        type: 'string'
      },
      session_data: {
        type: 'string'
      },
      timeCreated: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis'
      },
      timeUpdated: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis'
      },
      version: {
        type: 'integer'
      }
    };

    beforeEach(wrapAsync(async () => {
      await scenarioManager.reload(Scenario);
    }));

    it('should throw a ConflictError on creation conflicts.', wrapAsync(async () => {
      const model = new SessionModel(server);
      await model.create('sess1', {'version': 1});
      try {
        const index = await snapshot();
        expect(index.get('sess1')._source.version).to.be(1);
        await model.create('sess1', {'version': 1});
        expect().fail('SessionModel did not throw a ConflictError');
      } catch (error) {
        expect(error).to.be.a(ConflictError);
      }
    }));

    it('should index a session correctly.', wrapAsync(async () => {
      const model = new SessionModel(server);
      await model.update('sess1', {'version': 1});
      await model.update('sess1', {'version': 2});
      await model.update('sess2', {'version': 1});
      let index = await snapshot();
      expect(index.get('sess1')._source.version).to.be(2);
      expect(index.get('sess2')._source.version).to.be(1);
    }));

    it('should throw an Error if any exception occurs.', wrapAsync(async () => {
      const model = new SessionModel(server);
      await model.create('sess1', {'version': 1});
      try {
        const index = await snapshot();
        expect(index.get('sess1')._source.version).to.be(1);
        await model.create('sess1', {'version': 1});
        expect().fail('SessionModel did not throw a ConflictError');
      } catch (error) {
        expect(error).to.be.a(ConflictError);
      }
    }));

    it('should create mappings when creating a session if they do not exist.', wrapAsync(async () => {
      const mappingsBefore = await getMappings('session');
      expect(mappingsBefore).to.eql({});

      const model = new SessionModel(server);
      await model.create('sess1', {'version': 1});

      const index = await snapshot();
      const mappingsAfter = await getMappings('session');

      expect(index.get('sess1')._source.version).to.be(1);
      expect(mappingsAfter['.kibi'].mappings.session.properties).to.eql(sessionMappingProperties);
    }));

    it('should create mappings when indexing a session if they do not exist.', wrapAsync(async () => {
      const mappingsBefore = await getMappings('session');
      expect(mappingsBefore).to.eql({});

      const model = new SessionModel(server);
      await model.create('sess1', {'version': 1});

      const index = await snapshot();
      const mappingsAfter = await getMappings('session');

      expect(index.get('sess1')._source.version).to.be(1);
      expect(mappingsAfter['.kibi'].mappings.session.properties).to.eql(sessionMappingProperties);
    }));

    it('should not create mappings when creating a session if they already exist.', wrapAsync(async () => {

      await client.indices.putMapping({
        index: '.kibi',
        type: 'session',
        body: {
          properties: {
            string: {
              type: 'string'
            }
          }
        }
      });

      const model = new SessionModel(server);
      const session = await model.create('sess1', {'version': 1});

      const index = await snapshot();
      const mappingsAfter = await getMappings('session');

      expect(putMappingSpy.calledOnce).to.be(true);
      expect(index.get('sess1')._source.version).to.be(1);
      expect(mappingsAfter['.kibi'].mappings.session.properties).to.eql({
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
