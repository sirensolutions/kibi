import Scenario from './scenarios/empty/scenario';
import ModelTestHelper from './helper';
import requirefrom from 'requirefrom';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'index-pattern', 'title', 'idx');

  describe('IndexPatternModel', function () {

    const expectedMapping = {
      title: {
        type: 'text'
      },
      fieldFormatMap: {
        type: 'text'
      },
      fields: {
        type: 'text'
      },
      intervalName: {
        type: 'text'
      },
      notExpandable: {
        type: 'boolean'
      },
      paths: {
        type: 'text'
      },
      sourceFiltering: {
        type: 'text'
      },
      timeFieldName: {
        type: 'text'
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
