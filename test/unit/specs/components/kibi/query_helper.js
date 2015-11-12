define(function (require) {

  var fakeIndexPatterns = require('fixtures/fake_index_patterns');
  var fakeTimeFilter = require('fixtures/fake_time_filter');
  var fakeSavedDashboards = require('fixtures/saved_dashboards');
  var fakeSavedVisualisations = require('fixtures/saved_visualisations');
  var $rootScope;
  var queryHelper;

  function init(timefilterImpl, savedDashboardsImpl, indexPatternsImpl, visualizationsImpl) {
    return function () {
      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('kibana/index_patterns', function ($provide) {
        $provide.service('indexPatterns', indexPatternsImpl);
      });

      module('kibana', function ($provide) {
        $provide.service('timefilter', timefilterImpl);
      });

      module('app/visualize', function ($provide) {
        $provide.service('savedVisualizations', visualizationsImpl);
      });

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    beforeEach(init(fakeTimeFilter, fakeSavedDashboards, fakeIndexPatterns, fakeSavedVisualisations));

    describe('queryHelper', function () {
      describe('constructJoinFilter', function () {
        describe('join label', function () {
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
              expect(join.meta.value).to.be(expected);
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
              expect(join.meta.value).to.be(expected);
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
              expect(join.meta.value).to.be(expected);
              done();
            }).catch(function (err) {
              done(err);
            });

            $rootScope.$apply();
          });
        });

        describe('with queries', function () {
          it('query is custom - not a query_string', function (done) {
            var focus = 'article';
            var filters = {};
            var queries = {
              company: {
                constant_score: {
                  query: {
                    match: {
                      id: 'company/raavel'
                    }
                  }
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
                value: 'article <-> company'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('query_string is an analyzed wildcard', function (done) {
            var focus = 'article';
            var filters = {};
            var queries = {
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
                value: 'article <-> company'
              },
              join_set: {
                focus: focus,
                relations: relations,
                queries: {}
              }
            };

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add queries', function (done) {
            var focus = 'article';
            var filters = {};
            var queries = {
              company: {
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
                value: 'article <-> company'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add queries - query for focus ignored', function (done) {
            var focus = 'article';
            var filters = {};
            var queries = {
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
                value: 'article <-> company'
              },
              join_set: {
                focus: focus,
                relations: relations,
                queries: {}
              }
            };

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });
        });

        describe('with filters', function () {
          it('add filters', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {
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
                value: 'article <-> company'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              //console.log(JSON.stringify(filter, null, ' '));
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters make sure no meta in result', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {
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
                value: 'article <-> company'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              //console.log(JSON.stringify(filter, null, ' '));
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - respect negation', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {
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
                value: 'article <-> company'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - filter for focus ignored', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {
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
                value: 'article <-> company'
              },
              join_set: {
                focus: focus,
                relations: relations,
                queries: {}
              }
            };

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {
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
              'time-testing-3': 'time-testing-3'
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
                value: 'article <-> time-testing-3'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter when no other filters present', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {};
            var indexToDashboardMap = {
              'time-testing-3': 'time-testing-3'
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
                value: 'article <-> time-testing-3'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter when no other filters exept for focused index', function (done) {
            var focus = 'time-testing-3';
            var queries = {};
            var filters = {};
            var indexToDashboardMap = {
              'time-testing-3': 'time-testing-3'
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
                value: 'article <-> time-testing-3'
              },
              join_set: {
                focus: focus,
                relations: relations,
                queries: {}
              }
            };

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter when no other filters present - no indexToDashboard', function (done) {
            var focus = 'article';
            var queries = {};
            var filters = {};
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
                value: 'article <-> time-testing-3'
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

            queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
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
          var filters = {};
          var queries = {};
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
              value: 'article <-> company'
            },
            join_set: {
              focus: focus,
              relations: relations,
              queries: {}
            }
          };

          queryHelper.constructJoinFilter(focus, relations, filters, queries, indexToDashboardMap).then(function (filter) {
            expect(filter).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });
      });

      describe('construct or filter', function () {
        it('simple', function () {
          var esFieldName = 'fieldA';
          var ids = [1, 2, 3];
          var meta = {
            key: 'key',
            value: 'value'
          };

          var expected = {
            or: [
            {term:{fieldA: 1}},
            {term:{fieldA: 2}},
            {term:{fieldA: 3}}
            ],
            meta: meta
          };

          expect(queryHelper.constructOrFilter(esFieldName, ids, meta)).to.eql(expected);
        });

        it('esFieldName === null', function () {
          var esFieldName = null;
          var ids = [1, 2, 3];
          var meta = {
            key: 'key',
            value: 'value'
          };
          expect(queryHelper.constructOrFilter(esFieldName, ids, meta)).to.equal(false);
        });

        it('no meta.value', function () {
          var esFieldName = null;
          var ids = [1, 2, 3];
          var meta = {
            key: 'key'
          };
          expect(queryHelper.constructOrFilter(esFieldName, ids, meta)).to.equal(false);
        });

        it('no ids', function () {
          var esFieldName = null;
          var ids = null;
          var meta = {
            key: 'key',
            value: 'value'
          };
          expect(queryHelper.constructOrFilter(esFieldName, ids, meta)).to.equal(false);
        });

        it('empty ids', function () {
          var esFieldName = null;
          var ids = [];
          var meta = {
            key: 'key',
            value: 'value'
          };
          expect(queryHelper.constructOrFilter(esFieldName, ids, meta)).to.equal(false);
        });
      });
    });
  });
});
