import requirefrom from 'requirefrom';
import Scenario from './scenarios/empty/scenario';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const serverConfig = requirefrom('test')('serverConfig');
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'dashboard', 'title', 'dash');

  describe('DashboardModel', function () {

    const expectedMapping = {
      description: {
        type: 'string'
      },
      hits: {
        type: 'integer',
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'string'
          }
        }
      },
      optionsJSON: {
        type: 'string'
      },
      panelsJSON: {
        type: 'string'
      },
      savedSearchId: {
        type: 'string'
      },
      timeFrom: {
        type: 'string'
      },
      timeMode: {
        type: 'string'
      },
      timeRestore: {
        type: 'boolean'
      },
      timeTo: {
        type: 'string'
      },
      title: {
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
