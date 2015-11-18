define(function (require) {

  var _ = require('lodash');
  var fakeTimeFilter = require('fixtures/fake_time_filter');
  var fakeSavedDashboards = require('fixtures/fake_saved_dashboards_for_counts');
  var fakeSavedSearches = require('fixtures/fake_saved_searches');
  var datemath = require('utils/datemath');

  var $rootScope;
  var countHelper;
  var kibiStateHelper;

  var emptySavedSearch = {
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          filter: [],
          query: {}
        }
      )
    },
    searchSource: {
      _state: {
        index: {
          id: 'fake'
        }
      }
    }
  };


  var emptySavedSearchWithIndexWithTime = {
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          filter: [],
          query: {}
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
  };


  function init(timefilterImpl, savedDashboardsImpl, savedSearchesImpl) {
    return function () {

      if (timefilterImpl) {
        module('kibana', function ($provide) {
          $provide.service('timefilter', timefilterImpl);
        });
      }
      if (savedDashboardsImpl) {
        module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', savedDashboardsImpl);
        });
      }
      if (savedSearchesImpl) {
        module('discover/saved_searches', function ($provide) {
          $provide.service('savedSearches', savedSearchesImpl);
        });
      }

      if (!savedDashboardsImpl && !timefilterImpl) {
        module('kibana');
      }

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        countHelper = Private(require('components/kibi/count_helper/count_helper'));
        kibiStateHelper = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    describe('CountHelper', function () {

      describe('.costructCountQuery', function () {

        beforeEach(init());

        it('constructCountQuery - empty', function (done) {
          var dashboardId = 'Articles';
          var joinSetFilter = null;
          var savedSearch = emptySavedSearch;

          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: [],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          }).catch(done);

          $rootScope.$apply();
        });

        it('constructCountQuery - saved search', function (done) {
          var dashboardId = 'Articles';
          var joinSetFilter = null;

          // fake savedSearch
          var savedSearch = {
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  filter: [],
                  query: {
                    query_string: {
                      query: 'funded_year:>2010',
                      analyze_wildcard: true
                    }
                  }
                }
              )
            },
            searchSource: {
              _state: {
                index: {
                  id: 'fake'
                }
              }
            }
          };

          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
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
                    ],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          }).catch(done);

          $rootScope.$apply();
        });

      });

      describe('Using kibiStateHelper and kibiTimeHelper', function () {

        beforeEach(init(fakeTimeFilter, fakeSavedDashboards));

        it('constructCountQuery - check if filters taken from kibiState', function (done) {
          var dashboardId = 'Articles';
          var joinSetFilter = null;
          var savedSearch = emptySavedSearch;
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

          kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);

          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
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
                    ],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });


        it('constructCountQuery - check if query is taken from kibiState', function (done) {
          var dashboardId = 'Articles';
          var joinSetFilter = null;
          var savedSearch = emptySavedSearch;
          var query = {
            query_string: {
              query: 'AAA'
            }
          };

          kibiStateHelper.saveQueryForDashboardId(dashboardId, query);

          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
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
                    ],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });


        it('constructCountQuery - do not take filter from kibi state when disabled', function (done) {
          var dashboardId = 'Articles';
          var savedSearch = emptySavedSearch;
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
          kibiStateHelper.saveFiltersForDashboardId(dashboardId, negatedFilters);


          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: [],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('constructCountQuery - different types of filters', function (done) {
          var dashboardId = 'Articles';
          var savedSearch = emptySavedSearch;
          var joinSetFilter = null;
          var differentKindOfFilters = [
            {
              range: {}
            },
            {
              query: {}
            },
            {
              or: {}
            },
            {
              dbfilter: {}
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
          kibiStateHelper.saveFiltersForDashboardId(dashboardId, differentKindOfFilters);


          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: differentKindOfFilters,
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('constructCountQuery - different types of filters negated', function (done) {
          var dashboardId = 'Articles';
          var savedSearch = emptySavedSearch;
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
              or: {}
            },
            {
              meta:{negate:true},
              dbfilter: {}
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
          kibiStateHelper.saveFiltersForDashboardId(dashboardId, differentKindOfNegatedFilters);


          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: [],
                    must_not: _.map(differentKindOfNegatedFilters, function (f) {
                      return _.omit(f, 'meta');
                    })
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });


        it('constructCountQuery - replace join filter if present in kibiState', function (done) {
          var dashboardId = 'Articles';
          var joinSetFilter = {
            join_set: {
              indexes: [{id: 'index2'}]
            }
          };
          var savedSearch = emptySavedSearch;
          var stateFilters = [
            {
              join_set: {
                indexes: [{id: 'index1'}]
              }
            }
          ];

          kibiStateHelper.saveFiltersForDashboardId(dashboardId, stateFilters);

          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: [
                      {
                        join_set: {
                          indexes: [{id: 'index2'}]
                        }
                      }
                    ],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('constructCountQuery - replace join filter if present in kibiState', function (done) {
          var dashboardId = 'Articles';
          var savedSearch = emptySavedSearch;
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
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: [
                      {
                        join_set: {
                          indexes: [{id: 'index2'}]
                        }
                      }
                    ],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('constructCountQuery - get time filter', function (done) {
          var dashboardId = 'time-testing-4';
          var joinSetFilter = null;
          var savedSearch = emptySavedSearchWithIndexWithTime;

          var expected = {
            size: 0,
            query: {
              filtered: {
                query: {
                  match_all: {}
                },
                filter: {
                  bool: {
                    must: [
                      {
                        range: {
                          fake_field: {
                            gte: datemath.parse('2005-09-01T12:00:00.000Z').valueOf(), // taken from dashboard time-testing-3
                            lte: datemath.parse('2015-09-05T12:00:00.000Z').valueOf()
                          }
                        }
                      }
                    ],
                    must_not: []
                  }
                }
              }
            }
          };

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            expect(query).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('constructCountQuery - get time filter - dashboard does not exists -should reject', function (done) {
          var dashboardId = 'time-testing-3XXX';
          var joinSetFilter = null;
          var savedSearch = emptySavedSearchWithIndexWithTime;

          countHelper.constructCountQuery(dashboardId, savedSearch, joinSetFilter).then(function (query) {
            // should not go here
          }).catch(function (err) {
            expect(err.message).to.equal('Could not find a dashboard with id: time-testing-3XXX');
            done();
          });

          $rootScope.$apply();
        });
      });

      describe('Using kibiStateHelper and kibiTimeHelper and saveSearches', function () {

        beforeEach(init(fakeTimeFilter, fakeSavedDashboards, fakeSavedSearches));

        it('getCountQueryForDashboardId - should reject if dashboard does not have savedSearchId', function (done) {

          countHelper.getCountQueryForDashboardId('Articles').then(function (query) {
          }).catch(function (err) {
            expect(err.message).to.equal('For computing counts dashboard must have savedSearchId');
            done();
          });

          $rootScope.$apply();
        });

        it('getCountQueryForDashboardId - dashboard has savedSearchId', function (done) {
          var expected = '';

          countHelper.getCountQueryForDashboardId('time-testing-4').then(function (queryDef) {
            expect(queryDef.indexPatternId).to.equal('time-testing-4');
            expect(queryDef).to.have.property('query');
            done();
          });

          $rootScope.$apply();
        });


      });

    });
  });
});
