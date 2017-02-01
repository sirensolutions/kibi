import Scenario from './scenarios/empty/scenario';
import ModelTestHelper from './helper';
import requirefrom from 'requirefrom';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'query', 'description', 'query');

  describe('Query', function () {

    const expectedMapping = {
      title: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      activationQuery: {
        type: 'string'
      },
      resultQuery: {
        type: 'string'
      },
      datasourceId: {
        type: 'string'
      },
      tags: {
        type: 'string'
      },
      rest_params: {
        type: 'string'
      },
      rest_headers: {
        type: 'string'
      },
      rest_variables: {
        type: 'string'
      },
      rest_body: {
        type: 'string'
      },
      rest_method: {
        type: 'string'
      },
      rest_path: {
        type: 'string'
      },
      rest_resp_status_code: {
        type: 'long'
      },
      activation_rules: {
        type: 'string'
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'string'
          }
        }
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

    it('should index a query correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a query if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a query if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a query if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
