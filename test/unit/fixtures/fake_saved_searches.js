define(function (require) {

  var fakeSavedSearches = {
    'time-testing-4': {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            'filter': [],
            'query': {}
          }
        )
      },
      searchSource: {
        _state: {
          index: {
            id: 'time-testing-4'  // here put this id to make sure fakeTimeFilter will supply the timfilter for it
          }
        }
      }
    }
  };

  return function (Promise) {

    var indexPatternsMock = {
      get: function (id) {
        if (fakeSavedSearches[id]) {
          return Promise.resolve(fakeSavedSearches[id]);
        } else {
          return Promise.reject(new Error('SavedSearch with id: ' + id + ' does not exists'));
        }
      }
    };

    return indexPatternsMock;
  };
});
