import { IndexPatternsPatternCacheProvider } from 'ui/index_patterns/_pattern_cache';
import { StubIndexPatternProvider } from 'test_utils/stub_index_pattern';
import _ from 'lodash';

export function mockSavedObjects(Promise, Private) {
  const StubIndexPattern = Private(StubIndexPatternProvider);
  const patternCache = Private(IndexPatternsPatternCacheProvider);
  // kibi: simulate missing indices and generic errors
  const { IndexPatternMissingIndices } = require('ui/errors');

  return function (name, objects = [], cache = false) {
    // kibi: simulate missing indices and generic errors
    const getIndex = function ({ id, timeField, fields = [], indexList, missing, error }) {
      let index;

      // kibi: simulate missing indices and generic errors
      if (missing) {
        return Promise.reject(new IndexPatternMissingIndices());
      }

      if (error) {
        return Promise.reject(new Error('Generic error message'));
      }
      // kibi: end

      if (cache) {
        index = patternCache.get(id);
      }
      if (!index) {
        index = new StubIndexPattern(id, timeField, fields, indexList);
      }
      if (cache) {
        patternCache.set(id, index);
      }
      return index;
    };

    return {
      get: function (id) {
        const object = _.find(objects, 'id', id);

        if (!object) {
          return Promise.reject(new Error(`Could not find object with id: ${id}`));
        }
        if (name === 'indexPatterns') {
          return Promise.resolve(getIndex.call(this, object));
        } else if (object.kibanaSavedObjectMeta && object.kibanaSavedObjectMeta.searchSourceJSON) {
          // saved search
          const searchSource = JSON.parse(object.kibanaSavedObjectMeta.searchSourceJSON);
          const index = getIndex({ id: searchSource.index });
          object.searchSource = {
            _state: {
              index
            }
          };
        }
        return Promise.resolve(object);
      },
      find: function () {
        return Promise.resolve({
          total: objects.length,
          hits: objects
        });
      }
    };
  };
};
