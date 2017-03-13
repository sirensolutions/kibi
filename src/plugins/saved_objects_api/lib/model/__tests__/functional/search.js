import requirefrom from 'requirefrom';
import Scenario from './scenarios/empty/scenario';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const serverConfig = requirefrom('test')('serverConfig');
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'search', 'title', 'search');

  describe('SearchModel', function () {

    const expectedMapping = {
      title: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      columns: {
        type: 'string'
      },
      sort: {
        type: 'string'
      },
      hits: {
        type: 'integer'
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

    it('should index a search correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a search if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a search if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a search if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
