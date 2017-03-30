import Scenario from './scenarios/empty/scenario';
import ModelTestHelper from './helper';
import requirefrom from 'requirefrom';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'query', 'description', 'query');

  describe('Query', function () {

    const expectedMapping = {
      title: {
        type: 'text'
      },
      description: {
        type: 'text'
      },
      activationQuery: {
        type: 'text'
      },
      resultQuery: {
        type: 'text'
      },
      datasourceId: {
        type: 'text'
      },
      tags: {
        type: 'text'
      },
      rest_params: {
        type: 'text'
      },
      rest_headers: {
        type: 'text'
      },
      rest_variables: {
        type: 'text'
      },
      rest_body: {
        type: 'text'
      },
      rest_method: {
        type: 'text'
      },
      rest_path: {
        type: 'text'
      },
      rest_resp_status_code: {
        type: 'long'
      },
      activation_rules: {
        type: 'text'
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'text'
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
