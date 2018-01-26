import Scenario from './scenarios/empty/scenario';
import requirefrom from 'requirefrom';
import ModelTestHelper from './helper';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'dashboard', 'title', 'dash');

  describe('DashboardModel', function () {

    const expectedMapping = {
      description: {
        type: 'text'
      },
      hits: {
        type: 'integer',
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'text'
          }
        }
      },
      optionsJSON: {
        type: 'text'
      },
      panelsJSON: {
        type: 'text'
      },
      savedSearchId: {
        type: 'text'
      },
      timeFrom: {
        type: 'text'
      },
      timeMode: {
        type: 'text'
      },
      timeRestore: {
        type: 'boolean'
      },
      timeTo: {
        type: 'text'
      },
      refreshInterval: {
        properties: {
          display: {
            type: 'text'
          },
          pause: {
            type: 'boolean'
          },
          section: {
            type: 'long'
          },
          value: {
            type: 'long'
          }
        }
      },
      title: {
        type: 'text'
      },
      uiStateJSON: {
        type: 'text'
      },
      version: {
        type: 'integer'
      },
      priority: {
        type: 'long'
      }
    };

    beforeEach(wrapAsync(async () => {
      await helper.reload(Scenario);
    }));

    it('should throw a ConflictError on creation conflicts.', wrapAsync(async () => {
      return helper.testCreation();
    }));

    it('should index a dashboard correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a dashboard if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a dashboard if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a dashboard if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
