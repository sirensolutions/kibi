define(function (require) {

  var fakeIndexPatterns = require('fixtures/fake_index_patterns');
  var fakeTimeFilter = require('fixtures/fake_time_filter');
  var fakeSavedDashboards = require('fixtures/saved_dashboards');
  var $rootScope;
  var queryHelper;

  function init(timefilterImpl, savedDashboardsImpl, indexPatternsImpl) {
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

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    beforeEach(init(fakeTimeFilter, fakeSavedDashboards, fakeIndexPatterns));

    describe('queryHelper', function () {
      describe('constructJoinFilter', function () {
        describe('join label', function () {
          it('should output correct join label 1', function (done) {
            var focus = 'a';
            var relations = [
              [ 'a.id', 'b.id' ],
              [ 'b.id', 'c.id' ],
              [ 'd.id', 'e.id' ]
            ];
            var expected = 'a <-> b <-> c';

            queryHelper.constructJoinFilter(focus, null, relations, null).then(function (join) {
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
              [ 'a.id', 'b.id' ],
              [ 'b.id', 'c.id' ],
              [ 'c.id', 'd.id' ]
            ];
            var expected = 'a <-> b <-> c <-> d';
            queryHelper.constructJoinFilter(focus, null, relations, null).then(function (join) {
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
              [ 'a.id', 'b.id' ],
              [ 'b.id', 'b.id' ]
            ];
            var expected = 'a <-> b';
            queryHelper.constructJoinFilter(focus, null, relations, null).then(function (join) {
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
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
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

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('query_string is an analysed wildcard', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
            var filters = {};
            var queries = {
              company: {
                query_string: {
                  query: '*'
                }
              }
            };
            var indexToDashboardMap;

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {}
              }
            };

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add queries', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
            var filters = {};
            var queries = {
              company: {
                query_string: {
                  query: 'Awesome company'
                }
              }
            };
            var indexToDashboardMap;

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add queries - query for focus ignored', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
            var filters = {};
            var queries = {
              article: {
                query_string: {
                  query: 'Awesome company'
                }
              }
            };
            var indexToDashboardMap;

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {}
              }
            };

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });
        });

        describe('with filters', function () {
          it('add filters', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
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

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              //console.log(JSON.stringify(filter, null, ' '));
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters make sure no meta in result', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
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

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              //console.log(JSON.stringify(filter, null, ' '));
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - respect negation', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
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

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - filter for focus ignored', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
            var relations = [
              ['article.id', 'company.articleId']
            ];
            var queries = {};
            var filters = {
              article: {
                query_string: {
                  query: 'Awesome company'
                }
              }
            };
            var indexToDashboardMap;

            var expected = {
              meta: {
                value: 'article <-> company'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {}
              }
            };

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'time-testing-3', type: 'time-testing-3'} ];
            var relations = [
              ['article.id', 'time-testing-3.articleId']
            ];
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

            var expected = {
              meta: {
                value: 'article <-> time-testing-3'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter when no other filters present', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'time-testing-3', type: 'time-testing-3'} ];
            var relations = [
              ['article.id', 'time-testing-3.articleId']
            ];
            var queries = {};
            var filters = {};
            var indexToDashboardMap = {
              'time-testing-3': 'time-testing-3'
            };

            var expected = {
              meta: {
                value: 'article <-> time-testing-3'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter when no other filters exept for focused index', function (done) {
            var focus = 'time-testing-3';
            var indexes = [{id: 'article', type: 'article'}, {id: 'time-testing-3', type: 'time-testing-3'} ];
            var relations = [
              ['article.id', 'time-testing-3.articleId']
            ];
            var queries = {};
            var filters = {};
            var indexToDashboardMap = {
              'time-testing-3': 'time-testing-3'
            };

            var expected = {
              meta: {
                value: 'article <-> time-testing-3'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {}
              }
            };

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });

          it('add filters - update time filter when no other filters present - no indexToDashboard', function (done) {
            var focus = 'article';
            var indexes = [{id: 'article', type: 'article'}, {id: 'time-testing-3', type: 'time-testing-3'} ];
            var relations = [
              ['article.id', 'time-testing-3.articleId']
            ];
            var queries = {};
            var filters = {};
            var indexToDashboardMap = null;

            var expected = {
              meta: {
                value: 'article <-> time-testing-3'
              },
              join: {
                focus: focus,
                indexes: indexes,
                relations: relations,
                filters: {
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

            queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
              expect(filter).to.eql(expected);
              done();
            });

            $rootScope.$apply();
          });
        });

        it('simple', function (done) {
          var focus = 'article';
          var indexes = [{id: 'article', type: 'article'}, {id: 'company', type: 'company'} ];
          var relations = [
            ['article.id', 'company.articleId']
          ];
          var filters = {};
          var queries = {};
          var indexToDashboardMap;

          var expected = {
            meta: {
              value: 'article <-> company'
            },
            join: {
              focus: focus,
              indexes: indexes,
              relations: relations,
              filters: {}
            }
          };

          queryHelper.constructJoinFilter(focus, indexes, relations, filters, queries, indexToDashboardMap).then(function (filter) {
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

        it('esFieldNmae === null', function () {
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
