import Scenario from './scenarios/empty/scenario';
import serverConfig from 'test_kibana/server_config';
import wrapAsync from 'test_utils/wrap_async';
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'session', 'description', 'sess');

  describe('Session', function () {

    const expectedMapping = {
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
      await helper.reload(Scenario);
    }));

    it('should throw a ConflictError on creation conflicts.', wrapAsync(async () => {
      return helper.testCreation();
    }));

    it('should index a session correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a session if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a session if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a session if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
