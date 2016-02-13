define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var visualisations = [
      {
        title: 'myvis1',
        visState: '{"params":{"queryIds":[{"id":"","queryId":"123","queryVariableName":"competitor"}]}}',
        description: '',
        savedSearchId: 'Articles',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"filter":[]}'
        }
      },
      {
        title: 'myvis2',
        visState: '{"params":{"queryIds":[{"queryId":"123"},{"queryId":"456"}]}}',
        description: '',
        savedSearchId: 'Articles',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"filter":[]}'
        }
      }
    ];

    return {
      find: function () {
        return Promise.resolve({ hits: visualisations });
      }
    };
  };
});
