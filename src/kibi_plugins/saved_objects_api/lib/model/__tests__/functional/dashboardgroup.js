import Scenario from './scenarios/empty/scenario';
import ModelTestHelper from './helper';
import requirefrom from 'requirefrom';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'dashboardgroup', 'title', 'dag');

  describe('Dashboardgroup', function () {

    const expectedMapping = {
      description: {
        type: 'text'
      },
      dashboards: {
        type: 'text'
      },
      hide: {
        type: 'boolean',
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'text'
          }
        }
      },
      iconCss: {
        type: 'text'
      },
      iconUrl: {
        type: 'text'
      },
      title: {
        type: 'text'
      },
      priority: {
        type: 'long'
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

    it('should index a dashboardgroup correctly.', wrapAsync(async () => {
      return helper.testIndexing();
    }));

    it('should create mappings when creating a dashboardgroup if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a dashboardgroup if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a dashboardgroup if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
