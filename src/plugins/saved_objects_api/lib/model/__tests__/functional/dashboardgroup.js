import requirefrom from 'requirefrom';
import DashboardgroupModel from '../../dashboardgroup';
import Scenario from './scenarios/empty/scenario';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');
const serverConfig = requirefrom('test')('serverConfig');
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, DashboardgroupModel, 'dashboardgroup', 'title', 'dag');

  describe('DashboardgroupModel', function () {

    const expectedMapping = {
      description: {
        type: 'string'
      },
      dashboards: {
        type: 'string'
      },
      hide: {
        type: 'boolean',
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'string'
          }
        }
      },
      iconCss: {
        type: 'string'
      },
      iconUrl: {
        type: 'string'
      },
      title: {
        type: 'string'
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
