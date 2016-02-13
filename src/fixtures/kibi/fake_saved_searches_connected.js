define(function (require) {

  var fakeSavedSearches = {
    'saved-search-articles1': {
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
            id: 'articles'
          }
        }
      }
    },
    'saved-search-articles2': {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            'filter': [{term: { user: 'BAR_FILTER'}}],
            'query': {query: {query_string: {query: 'BAR_QUERY'}}}
          }
        )
      },
      searchSource: {
        _state: {
          index: {
            id: 'articles'
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
