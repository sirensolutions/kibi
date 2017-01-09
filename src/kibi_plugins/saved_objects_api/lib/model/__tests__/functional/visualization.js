import Scenario from './scenarios/empty/scenario';
import serverConfig from 'test_kibana/server_config';
import wrapAsync from 'test_utils/wrap_async';
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'visualization', 'title', 'sess');

  describe('Visualization', function () {

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
      await helper.reload(Scenario);
    }));

    it('should throw a ConflictError on creation conflicts.', wrapAsync(async () => {
      return helper.testCreation();
    }));

    it('should index a visualization correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a visualization if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a visualization if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a visualization if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
