var expect = require('expect.js');
var ngMock = require('ngMock');

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var fakeIndexPatterns = [
  {
    id: 'article'
  },
  {
    id: 'company'
  },
  {
    id: 'time-testing-3'
  }
];
var fakeABCDEIndexPatterns = [
  {
    id: 'a'
  },
  {
    id: 'b'
  },
  {
    id: 'c'
  },
  {
    id: 'd'
  },
  {
    id: 'e'
  }
];
var fakeTimeFilter = require('fixtures/kibi/fake_time_filter');
var fakeSavedDashboards = [
  {
    id: 'Articles',
    title: 'Articles'
  },
  {
    id: 'Companies',
    title: 'Companies'
  },
  {
    id: 'time-testing-1',
    title: 'time testing 1',
    timeRestore: false
  },
  {
    id: 'time-testing-2',
    title: 'time testing 2',
    timeRestore: true,
    timeMode: 'quick',
    timeFrom: 'now-15y',
    timeTo: 'now'
  },
  {
    id: 'time-testing-3',
    title: 'time testing 3',
    timeRestore: true,
    timeMode: 'absolute',
    timeFrom: '2005-09-01T12:00:00.000Z',
    timeTo: '2015-09-05T12:00:00.000Z'
  }
];
var fakeSavedVisualisations = [
  {
    id: 'myvis1',
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
    id: 'myvis2',
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
var $rootScope;
var queryHelper;

function init(timefilterImpl, savedDashboards, indexPatterns, visualizations) {
  return function () {
    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
    });

    ngMock.module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', (Promise) => mockSavedObjects(Promise)('indexPatterns', indexPatterns));
    });

    ngMock.module('kibana', function ($provide) {
      $provide.service('timefilter', timefilterImpl);
    });

    ngMock.module('app/visualize', function ($provide) {
      $provide.service('savedVisualizations', (Promise) => mockSavedObjects(Promise)('savedVisualizations', visualizations));
    });

    ngMock.inject(function ($injector, Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      queryHelper = Private(require('ui/kibi/helpers/query_helper'));
    });
  };
}

describe('Kibi Components', function () {
  describe('queryHelper', function () {
    describe('join label', function () {
      beforeEach(init(fakeTimeFilter, fakeSavedDashboards, fakeABCDEIndexPatterns, fakeSavedVisualisations));

      it('should output correct join label 1', function (done) {
        var focus = 'a';
        var relations = [
          [
            {
              indices: [ 'a' ],
              path: 'id'
            },
            {
              indices: [ 'b' ],
              path: 'id'
            }
          ],
          [
            {
              indices: [ 'b' ],
              path: 'id'
            },
            {
              indices: [ 'c' ],
              path: 'id'
            }
          ],
          [
            {
              indices: [ 'd' ],
              path: 'id'
            },
            {
              indices: [ 'e' ],
              path: 'id'
            }
          ]
        ];
        var expected = 'a <-> b <-> c';

        queryHelper.constructJoinFilter(focus, relations, null).then(function (join) {
          expect(join.meta.alias).to.be(expected);
          done();
        }).catch(function (err) {
          done(err);
        });

        $rootScope.$apply();
      });

      it('should output correct join label 2', function (done) {
        var focus = 'a';
        var relations = [
          [
            {
              indices: [ 'a' ],
              path: 'id'
            },
            {
              indices: [ 'b' ],
              path: 'id'
            }
          ],
          [
            {
              indices: [ 'b' ],
              path: 'id'
            },
            {
              indices: [ 'c' ],
              path: 'id'
            }
          ],
          [
            {
              indices: [ 'c' ],
              path: 'id'
            },
            {
              indices: [ 'd' ],
              path: 'id'
            }
          ]
        ];
        var expected = 'a <-> b <-> c <-> d';
        queryHelper.constructJoinFilter(focus, relations, null).then(function (join) {
          expect(join.meta.alias).to.be(expected);
          done();
        }).catch(function (err) {
          done(err);
        });

        $rootScope.$apply();
      });

      it('should output correct join label 3', function (done) {
        var focus = 'a';
        var relations = [
          [
            {
              indices: [ 'a' ],
              path: 'id'
            },
            {
              indices: [ 'b' ],
              path: 'id'
            }
          ],
          [
            {
              indices: [ 'b' ],
              path: 'id'
            },
            {
              indices: [ 'b' ],
              path: 'id'
            }
          ]
        ];
        var expected = 'a <-> b';
        queryHelper.constructJoinFilter(focus, relations, null).then(function (join) {
          expect(join.meta.alias).to.be(expected);
          done();
        }).catch(function (err) {
          done(err);
        });

        $rootScope.$apply();
      });
    });


    describe('constructJoinFilter', function () {
      beforeEach(init(fakeTimeFilter, fakeSavedDashboards, fakeIndexPatterns, fakeSavedVisualisations));

      describe('with queries', function () {
        it('query is custom - not a query_string', function (done) {
          var focus = 'article';
          var filtersPerIndex = {};
          var queriesPerIndex = {
            company: [{
              constant_score: {
                query: {
                  match: {
                    id: 'company/raavel'
                  }
                }
              }
            }]
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                company : [
                  {
                    query: {
                      constant_score: {
                        query: {
                          match: {
                            id: 'company/raavel'
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('query_string is an analyzed wildcard', function (done) {
          var focus = 'article';
          var filtersPerIndex = {};
          var queriesPerIndex = {
            company: {
              query_string: {
                query: '*'
              }
            }
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {}
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add queries', function (done) {
          var focus = 'article';
          var filtersPerIndex = {};
          var queriesPerIndex = {
            company: [{
              query_string: {
                query: 'Awesome company'
              }
            }]
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                company : [
                  {
                    query: {
                      query_string: {
                        query: 'Awesome company'
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add queries - query for focus ignored', function (done) {
          var focus = 'article';
          var filtersPerIndex = {};
          var queriesPerIndex = {
            article: {
              query_string: {
                query: 'Awesome company'
              }
            }
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {}
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });
      });

      describe('with filters', function () {
        it('add filters 1', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {
            company: [{
              query: {
                query_string: {
                  query: 'Awesome company'
                }
              }
            }]
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                company : [
                  {
                    query: {
                      query_string: {
                        query: 'Awesome company'
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add filters 2 - make sure no meta in result', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {
            company: [{
              query: {
                query_string: {
                  query: 'Awesome company'
                }
              },
              meta: {}
            }]
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                company : [
                  {
                    query: {
                      query_string: {
                        query: 'Awesome company'
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add filters 3 - respect negation', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {
            company: [{
              query: {
                query_string: {
                  query: 'Awesome company'
                }
              },
              meta: {
                negate: true
              }
            }]
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                company : [
                  {
                    not: {
                      query: {
                        query_string: {
                          query: 'Awesome company'
                        }
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add filters 4 - filter for focus ignored', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {
            article: {
              query_string: {
                query: 'Awesome company'
              }
            }
          };
          var indexToDashboardMap;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'company' ],
                types: [ 'company' ],
                path: 'articleid'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {}
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add filters 5 - update time filter', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {
            'time-testing-3': [
              {
                query: {
                  query_string: {
                    query: 'Awesome time testing filter'
                  }
                }
              }
            ]
          };
          var indexToDashboardMap = {
            'time-testing-3': ['time-testing-3'],
            article: [ 'Articles' ]
          };
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'time-testing-3' ],
                types: [ 'time-testing-3' ],
                path: 'articleId'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'Articles <-> time-testing-3'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                'time-testing-3': [
                  {
                    query: {
                      query_string: {
                        query: 'Awesome time testing filter'
                      }
                    }
                  },
                  {
                    range: {
                      'fake_field': {
                        'gte': 1125576000000,  // these timestamps match the times in fakeSavedDashboards time-testing-3 dashboard
                        'lte': 1441454400000
                      }
                    }
                  }
                ]
              }
            }
          };


          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          }).catch(done);

          $rootScope.$apply();
        });

        it('add filters 6 - update time filter when no other filters present', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {};
          var indexToDashboardMap = {
            'time-testing-3': ['time-testing-3'],
            article: [ 'Articles' ]
          };
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'time-testing-3' ],
                types: [ 'time-testing-3' ],
                path: 'articleId'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'Articles <-> time-testing-3'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                'time-testing-3': [
                  {
                    range: {
                      'fake_field': {
                        'gte': 1125576000000,  // these timestamps match the times in fakeSavedDashboards time-testing-3 dashboard
                        'lte': 1441454400000
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add filters 7 - update time filter when no other filters exept for focused index', function (done) {
          var focus = 'time-testing-3';
          var queriesPerIndex = {};
          var filtersPerIndex = {};
          var indexToDashboardMap = {
            'time-testing-3': ['time-testing-3'],
            article: [ 'Articles' ]
          };
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'time-testing-3' ],
                types: [ 'time-testing-3' ],
                path: 'articleId'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'Articles <-> time-testing-3'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {}
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('add filters 8 - update time filter when no other filters present - no indexToDashboard', function (done) {
          var focus = 'article';
          var queriesPerIndex = {};
          var filtersPerIndex = {};
          var indexToDashboardMap = null;
          var relations = [
            [
              {
                indices: [ 'article' ],
                types: [ 'article' ],
                path: 'id'
              },
              {
                indices: [ 'time-testing-3' ],
                types: [ 'time-testing-3' ],
                path: 'articleId'
              }
            ]
          ];

          var expected = {
            meta: {
              alias: 'article <-> time-testing-3'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {
                'time-testing-3': [
                  {
                    range: {
                      'fake_field': {
                        'gte': 20,  // these timestamps match the fake time returned by fakeTimeFilter for time-testing-3 index
                        'lte': 40
                      }
                    }
                  }
                ]
              }
            }
          };

          queryHelper.constructJoinFilter(
            focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
          ).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });
      });

      describe('getVisualisations', function () {
        it('should return the visualisation that use query 456', function (done) {
          queryHelper.getVisualisations([ '456', '789' ]).then(function (visData) {
            expect(visData[0]).to.eql([ '456' ]);
            expect(visData[1]).to.have.length(1);
            expect(visData[1][0].title).to.be('myvis2');
            done();
          });

          $rootScope.$apply();
        });

        it('should return the visualisations that use queries 123 and 456', function (done) {
          queryHelper.getVisualisations([ '456', '123' ]).then(function (visData) {
            expect(visData[0]).to.have.length(2);
            expect(visData[0]).to.contain('123');
            expect(visData[0]).to.contain('456');
            expect(visData[1]).to.have.length(2);
            expect(visData[1][0].title).to.be('myvis1');
            expect(visData[1][1].title).to.be('myvis2');
            done();
          });

          $rootScope.$apply();
        });

        it('should return no visualisation', function (done) {
          queryHelper.getVisualisations([ '666' ]).then(function (visData) {
            expect(visData[0]).to.have.length(0);
            expect(visData[1]).to.have.length(0);
            done();
          });

          $rootScope.$apply();
        });
      });

      it('simple', function (done) {
        var focus = 'article';
        var filtersPerIndex = {};
        var queriesPerIndex = {};
        var indexToDashboardMap;
        var relations = [
          [
            {
              indices: [ 'article' ],
              types: [ 'article' ],
              path: 'id'
            },
            {
              indices: [ 'company' ],
              types: [ 'company' ],
              path: 'articleId'
            }
          ]
        ];

        var expected = {
          meta: {
            alias: 'article <-> company'
          },
          join_set: {
            focus: focus,
            relations: relations,
            queries: {}
          }
        };

        queryHelper.constructJoinFilter(
          focus, relations, filtersPerIndex, queriesPerIndex, indexToDashboardMap
        ).then(function (filter) {
          expect(filter).to.eql(expected);
          done();
        });

        $rootScope.$apply();
      });
    });
  });
});
