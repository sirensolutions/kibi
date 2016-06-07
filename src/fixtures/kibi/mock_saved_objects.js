define(function (require) {
  const _ = require('lodash');

  return function (Promise) {
    return function (name, objects = []) {
      return {
        get: function (id) {
          const object = _.find(objects, 'id', id);
          if (object) {
            if (object.kibanaSavedObjectMeta && object.kibanaSavedObjectMeta.searchSourceJSON) {
              const searchSource = JSON.parse(object.kibanaSavedObjectMeta.searchSourceJSON);
              object.searchSource = {
                _state: {
                  index: {
                    id: searchSource.index
                  }
                }
              };
            }
            return Promise.resolve(object);
          } else {
            return Promise.reject(new Error(`Could not find object with id: ${id}`));
          }
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
