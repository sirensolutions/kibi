import Scenario from './scenarios/empty/scenario';
import wrapAsync from 'test_utils/wrap_async';
import serverConfig from 'test_kibana/server_config';
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'template', 'description', 'tpl');

  describe('Template', function () {

    const expectedMapping = {
      title: {
        type: 'string'
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'string'
          }
        }
      },
      description: {
        type: 'string'
      },
      templateSource: {
        type: 'string'
      },
      templateEngine: {
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

    it('should index a template correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a template if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a template if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a template if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
