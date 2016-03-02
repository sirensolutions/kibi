define(function (require) {

  var fakeSavedSearches = [
    {
      id: 'search-ste',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'search-ste',
            filter: [],
            query: {}
          }
        )
      }
    },
    {
      id: 'time-testing-4',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'time-testing-4', // here put this id to make sure fakeTimeFilter will supply the timfilter for it
            filter: [],
            query: {}
          }
        )
      }
    }
  ];

  return function (Promise) {
    let extras = [];

    var indexPatternsMock = {
      /**
       * Add a new dashboard
       */
      addExtra: function (dashboard) {
        extras.push(dashboard);
      },
      removeExtras: function () {
        extras = [];
      },
      find: function () {
        const ss = fakeSavedSearches.concat(extras);
        return Promise.resolve({ hits: ss, total: ss.length });
      },
      get: function (id) {
        const ss = fakeSavedSearches.concat(extras);
        const savedSearch = _.find(ss, 'id', id);

        if (savedSearch) {
          const savedSearchMeta = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
          savedSearch.searchSource = {
            _state: {
              index: {
                id: savedSearchMeta.index
              }
            }
          };
          return Promise.resolve(savedSearch);
        } else {
          return Promise.reject(new Error('SavedSearch with id: ' + id + ' does not exists'));
        }
      }
    };

    return indexPatternsMock;
  };
});
