var _ = require('lodash');
var expect = require('expect.js');
var ngMock = require('ngMock');

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var fakeTimeFilter = require('fixtures/kibi/fake_time_filter');
var fakeSavedDashboards = [
  {
    id: 'Articles',
    title: 'Articles'
  },
  {
    id: 'search-ste',
    title: 'search-ste',
    savedSearchId: 'search-ste'
  },
  {
    id: 'time-testing-4',
    title: 'time-testing-4',
    timeRestore: true,
    timeFrom: '2005-09-01T12:00:00.000Z',
    timeTo: '2015-09-05T12:00:00.000Z',
    savedSearchId: 'time-testing-4'
  }
];
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
var dateMath = require('ui/utils/dateMath');

var $rootScope;
var countHelper;
var kibiStateHelper;
var urlHelper;

function init(timefilterImpl, savedDashboards, savedSearches) {
  return function () {


    if (timefilterImpl) {
      ngMock.module('kibana', function ($provide) {
        $provide.service('timefilter', timefilterImpl);
      });
    }
    if (savedDashboards) {
      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', fakeSavedDashboards.concat(
          [
            {
              id: 'empty-dashboard',
              title: 'empty-dashboard',
              savedSearchId: 'empty saved search'
            },
            {
              id: 'empty-dashboard-with-time',
              title: 'empty-dashboard-with-time',
              savedSearchId: 'empty saved search with index with time'
            },
            {
              id: 'query-dashboard',
              title: 'query-dashboard',
              savedSearchId: 'saved search with query'
            }
          ]
        )));
      });
    }
    if (savedSearches) {
      ngMock.module('discover/saved_searches', function ($provide) {
        $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', fakeSavedSearches.concat(
          [
            {
              id: 'empty saved search',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'fake',
                    filter: [],
                    query: {}
                  }
                )
              }
            },
            {
              id: 'empty saved search with index with time',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'time-testing-4', // here put this id to make sure fakeTimeFilter will supply the timfilter for it
                    filter: [],
                    query: {}
                  }
                )
              }
            },
            {
              id: 'saved search with query',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'fake',
                    filter: [],
                    query: {
                      query_string: {
                        query: 'funded_year:>2010',
                        analyze_wildcard: true
                      }
                    }
                  }
                )
              }
            }
          ])));
      });
    }
    if (!savedDashboards && !timefilterImpl) {
      ngMock.module('kibana');
    }

    ngMock.module('kibana', function ($provide) {

      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.service('config', function () {
        return {
          get: function (key) {
            if (key === 'kibi:relationalPanel') {
              return false;
            } else {
              return null;
            }
          }
        };
      });
    });


    ngMock.inject(function ($injector, Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      countHelper = Private(require('ui/kibi/helpers/count_helper/count_helper'));
      kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
      urlHelper = Private(require('ui/kibi/helpers/url_helper'));
    });
  };
}

describe('Kibi Components', function () {
  describe('CountHelper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(init(fakeTimeFilter, fakeSavedDashboards, fakeSavedSearches));

    describe('constructCountQuery', function () {

      it('constructCountQuery - empty', function (done) {
        var joinSetFilter = null;

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: []
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });

      it('constructCountQuery - saved search', function (done) {
        var joinSetFilter = null;

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: [
                    {
                      query: {
                        query_string: {
                          query: 'funded_year:>2010',
                          analyze_wildcard: true
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'query-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });

    });

    describe('Using kibiStateHelper and kibiTimeHelper', function () {

      it('constructCountQuery - check if filters taken from kibiState', function (done) {
        var joinSetFilter = null;
        var filters = [
          {
            range: {
              fake_field: {
                gte: 20,
                lte: 40
              }
            }
          }
        ];

        kibiStateHelper.saveFiltersForDashboardId('empty-dashboard', filters);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: [
                    {
                      range: {
                        fake_field: {
                          gte: 20,
                          lte: 40
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });


      it('constructCountQuery - check if query is taken from kibiState', function (done) {
        var joinSetFilter = null;
        var query = {
          query_string: {
            query: 'AAA'
          }
        };

        kibiStateHelper.saveQueryForDashboardId('empty-dashboard', query);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: [
                    {
                      query: {
                        query_string: {
                          query: 'AAA'
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });


      it('constructCountQuery - do not take filter from kibi state when disabled', function (done) {
        var joinSetFilter = null;
        var negatedFilters = [
          {
            meta:{
              disabled: true
            },
            range: {
              fake_field: {
                gte: 20,
                lte: 40
              }
            }
          }
        ];
        kibiStateHelper.saveFiltersForDashboardId('empty-dashboard', negatedFilters);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: []
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });

      it('constructCountQuery - different types of filters', function (done) {
        var joinSetFilter = null;
        var differentKindOfFilters = [
          {
            range: {}
          },
          {
            query: {}
          },
          {
            dbfilter: {}
          },
          {
            or: {}
          },
          {
            exists: {}
          },
          {
            geo_bounding_box: {}
          },
          {
            missing: {}
          },
          {
            script: {}
          },
          {
            join_set: {}
          },
          {
            join_sequence: {}
          }
        ];
        kibiStateHelper.saveFiltersForDashboardId('empty-dashboard', differentKindOfFilters);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: differentKindOfFilters
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });

      it('constructCountQuery - different types of filters negated', function (done) {
        var joinSetFilter = null;
        var differentKindOfNegatedFilters = [
          {
            meta:{negate:true},
            range: {}
          },
          {
            meta:{negate:true},
            query: {}
          },
          {
            meta:{negate:true},
            dbfilter: {}
          },
          {
            meta:{negate:true},
            or: {}
          },
          {
            meta:{negate:true},
            exists: {}
          },
          {
            meta:{negate:true},
            geo_bounding_box: {}
          },
          {
            meta:{negate:true},
            missing: {}
          },
          {
            meta:{negate:true},
            script: {}
          },
          {
            meta:{negate:true},
            join_set: {}
          }
        ];
        kibiStateHelper.saveFiltersForDashboardId('empty-dashboard', differentKindOfNegatedFilters);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: _.map(differentKindOfNegatedFilters, function (f) {
                return _.omit(f, 'meta');
              }),
              filter: {
                bool: {
                  must: []
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });


      it('constructCountQuery - replace join filter if present in kibiState', function (done) {
        var joinSetFilter = {
          join_set: {
            indexes: [{id: 'index2'}]
          }
        };
        var stateFilters = [
          {
            join_set: {
              indexes: [{id: 'index1'}]
            }
          }
        ];

        kibiStateHelper.saveFiltersForDashboardId('empty-dashboard', stateFilters);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: [
                    {
                      join_set: {
                        indexes: [{id: 'index2'}]
                      }
                    }
                  ]
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ 'empty-dashboard' ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });

      it('constructCountQuery - replace join filter if present in kibiState', function (done) {
        var dashboardId = 'empty-dashboard';
        var stateFilters = [
          {
            join_set: {
              indexes: [{id: 'index1'}]
            }
          }
        ];
        var joinSetFilter = {
          join_set: {
            indexes: [{id: 'index2'}]
          }
        };

        kibiStateHelper.saveFiltersForDashboardId(dashboardId, stateFilters);

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: [
                    {
                      join_set: {
                        indexes: [{id: 'index2'}]
                      }
                    }
                  ]
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ dashboardId ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });

      it('constructCountQuery - get time filter', function (done) {
        var dashboardId = 'time-testing-4';
        var joinSetFilter = null;

        var expected = {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: [
                    {
                      range: {
                        fake_field: {
                          gte: dateMath.parse('2005-09-01T12:00:00.000Z').valueOf(), // taken from dashboard time-testing-4
                          lte: dateMath.parse('2015-09-05T12:00:00.000Z').valueOf()
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        };

        urlHelper.getDashboardAndSavedSearchMetas([ dashboardId ])
        .then(([ { savedDash, savedSearchMeta } ]) =>  countHelper.constructCountQuery(savedDash, savedSearchMeta, joinSetFilter))
        .then(function (query) {
          expect(query).to.eql(expected);
          done();
        }).catch(done);
      });
    });

    describe('Using kibiStateHelper and kibiTimeHelper and savedSearches', function () {

      it('getCountQueryForDashboardId - should reject if dashboard does not have savedSearchId', function (done) {
        countHelper.getCountQueryForDashboardId('Articles').then(function (query) {
          done(query);
        }).catch(function (err) {
          expect(err.message).to.equal('The dashboard [Articles] is expected to be associated with a saved search.');
          done();
        });
      });

      it('getCountQueryForDashboardId - dashboard has savedSearchId', function (done) {
        countHelper.getCountQueryForDashboardId('time-testing-4').then(function (queryDef) {
          expect(queryDef.indexPatternId).to.equal('time-testing-4');
          expect(queryDef).to.have.property('query');
          done();
        }).catch(done);
      });

    });

  });
});
