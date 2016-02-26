define(function (require) {

  const _ = require('lodash');

  var fakeSavedSearches = [
    {
      id: 'saved-search-articles0',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'articles',
            filter: [
              {
                term: {
                  user: 'filter0'
                }
              }
            ],
            query: {
              query: {
                query_string: {
                  query: 'query0'
                }
              }
            }
          }
        )
      }
    },
    {
      id: 'saved-search-articles1',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'articles',
            filter: [],
            query: {}
          }
        )
      }
    },
    {
      id: 'saved-search-articles2',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'articles',
            filter: [
              {
                term: {
                  user: 'BAR_FILTER'
                }
              }
            ],
            query: {
              query: {
                query_string: {
                  query: 'BAR_QUERY'
                }
              }
            }
          }
        )
      }
    },
    {
      id: 'saved-search-person',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'person',
            filter: [
              {
                term: {
                  user: 'person'
                }
              }
            ],
            query: {
              query: {
                query_string: {
                  query: 'person'
                }
              }
            }
          }
        )
      }
    },
    {
      id: 'saved-search-companies',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'company',
            filter: [
              {
                term: {
                  user: 'company'
                }
              }
            ],
            query: {
              query: {
                query_string: {
                  query: 'company'
                }
              }
            }
          }
        )
      }
    }
  ];

  return function (Promise) {

    var indexPatternsMock = {
      find: function () {
        return {
          hits: fakeSavedSearches,
          total: fakeSavedSearches.length
        };
      },
      get: function (id) {
        const savedSearch = _.find(fakeSavedSearches, 'id', id);

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
          return Promise.reject(new Error(`SavedSearch with id: ${id} does not exists`));
        }
      }
    };

    return indexPatternsMock;
  };
});
