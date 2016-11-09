define(function (require) {
  const _ = require('lodash');

  return function (Promise, Private) {
    const StubIndexPattern = Private(require('testUtils/stub_index_pattern'));
    const patternCache = Private(require('ui/index_patterns/_pattern_cache'));

    return function (name, objects = [], cache = false) {
      const getIndex = function ({ id, timeField, fields = [], indexList }) {
        let index;

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
          if (object._type === 'indexPattern') {
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
});
