describe('Kibi Settings', function () {
  var ngMock = require('ngMock');
  var expect = require('expect.js');
  var _ = require('lodash');
  var Promise = require('bluebird');
  var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
  var $scope;
  var $timeout;
  var config;
  var jQuery = require('jquery');
  var indexToDashboardMapPromise;
  var unbind = [];

  function init({ savedDashboards, savedSearches, indexToDashboardsMap, relations, events }) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', 'dashboard');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', savedSearches || []));
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards || []));
    });

    ngMock.inject(function (_$timeout_, $injector, $rootScope, $controller, Private) {
      indexToDashboardMapPromise = Promise.resolve(indexToDashboardsMap);

      $timeout = _$timeout_;
      config = $injector.get('config');
      config.set('kibi:relations', relations);

      $scope = $rootScope;
      var el = '<div><form name="dashboardsForm" class="ng-valid"/><form name="indicesForm" class="ng-valid"/></div>';
      $controller('RelationsController', {
        $scope: $scope,
        $element: jQuery(el)
      });
      if (indexToDashboardsMap) {
        $scope.getIndexToDashboardMap = function () {
          return indexToDashboardMapPromise;
        };
      }
      if (events) {
        _.each(events, function (func, e) {
          unbind.push($scope.$on(e, func));
        });
      }
      $scope.$digest();
    });
  }

  function after() {
    _.each(unbind, function (off) {
      off();
    });
    unbind = [];
  }

  describe('Relations Section', function () {
    describe('create an index to dashboards map', function () {
      require('testUtils/noDigestPromises').activateForSuite();
      beforeEach(() => init({
        savedDashboards: [
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
        ],
        savedSearches: [
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
        ]
      }));

      it('should fail because a dashboard does not have a saved search and ignoreMissingSavedSearch not set', function (done) {
        $scope.getIndexToDashboardMap().then(function (results) {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.be('The dashboard [Articles] is expected to be associated with a saved search.');
          done();
        });
      });

      it('should NOT fail with dashboard missing a saved search when ignoreMissingSavedSearch set to true and first parameter empty',
        function (done) {
          var expected = {
            'search-ste': ['search-ste'],
            'time-testing-4': ['time-testing-4']
          };

          $scope.getIndexToDashboardMap(null, true).then(function (results) {
            expect(results, expected);
            done();
          }).catch(done);
        }
      );

      it('should NOT fail with dashboard missing a saved search when ignoreMissingSavedSearch is true and first parameter is array of ids',
        function (done) {
          var expected = {
            'time-testing-4': ['time-testing-4']
          };

          $scope.getIndexToDashboardMap(['time-testing-4'], true).then(function (results) {
            expect(results, expected);
            done();
          }).catch(done);
        }
      );

      it('getIndexToDashboardMap pass ids of dashboards', function (done) {
        var expected = {
          'time-testing-4': ['time-testing-4']
        };

        $scope.getIndexToDashboardMap(['time-testing-4']).then(function (results) {
          expect(results).to.eql(expected);
          done();
        }).catch(done);
      });

      it('dashboard is not selected but has a savedsearch', function (done) {
        var expected = {
          'search-ste': ['search-ste']
        };

        $scope.getIndexToDashboardMap(['search-ste']).then(function (results) {
          expect(results).to.eql(expected);
          done();
        }).catch(done);
      });
    });

    describe('index patterns graph', function () {

      afterEach(after);

      it('should create the graph of indices', function () {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel-a-b'
            }
          ]
        };

        init({ relations: relations });
        _.each($scope.relations.relationsIndices, function (relation) {
          expect(relation.error).to.be('');
        });
      });

      it('should throw an error if left and right sides of the join are the same', function () {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                }
              ],
              label: 'rel-a-a'
            }
          ]
        };

        init({ relations: relations });
        _.each($scope.relations.relationsIndices, function (relation) {
          expect(relation.error).to.be('Left and right sides of the relation cannot be the same.');
        });
      });

      it('should throw an error if there are duplicates', function () {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel-a-b'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                }
              ],
              label: 'rel-a-b-2'
            }
          ]
        };

        init({ relations: relations });
        _.each($scope.relations.relationsIndices, function (relation) {
          expect(relation.error).to.be('These relationships are equivalent, please remove one');
        });
      });

      it('should create a unique ID for the relation', function () {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index/a',
                  path: 'path/a1'
                },
                {
                  indexPatternId: 'index/b',
                  path: 'path/b1'
                }
              ],
              label: 'rel-a-b'
            },
            {
              indices: [
                {
                  indexPatternId: 'index/a',
                  path: 'path/a2'
                },
                {
                  indexPatternId: 'index/b',
                  path: 'path/b2'
                }
              ],
              label: 'rel-a-b'
            }
          ]
        };

        init({ relations: relations });
        expect(_($scope.relations.relationsIndices).pluck('id').uniq().compact().value()).to.have.length(2);
      });

      it('should save only the configuration fields', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel-a-b',
              error: ''
            }
          ]
        };

        var options = {
          relations: relations,
          events: {
            'change:config.kibi:relations': function (event, relations) {
              _.each(relations.relationsIndices, function (relation) {
                expect(relation.error).to.be(undefined);
                expect(relation.label).not.to.be(undefined);
                expect(relation.indices).not.to.be(undefined);
              });
              done();
            }
          }
        };

        init(options);
        $timeout.flush();
      });
    });

    describe('dashboards graph', function () {
      it('should remove all if all components are defined - what is retained is up to st-select', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a1'
                },
                {
                  indexPatternId: 'index-a',
                  path: 'path-a2'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da2', 'Da1' ],
              relation: 'index-a/path-a1/index-a/path-a2'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(1);
          expect($scope.filterDashboards(0, { value: 'Da1' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Da2' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Db' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Dc' })).to.be(true);
          done();
        });
      });

      it('should test for the watched value of filterDashboards', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a1'
                },
                {
                  indexPatternId: 'index-a',
                  path: 'path-a2'
                }
              ],
              label: 'rel',
              id: 'index-a/path-a1/index-a/path-a2'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel',
              id: 'index-b/path-b/index-c/path-c'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da2', 'Da1' ],
              relation: 'index-a/path-a1/index-a/path-a2'
            },
            {
              dashboards: [ 'Db', 'Dc' ],
              relation: 'index-b/path-b/index-c/path-c'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(2);
          const actual = $scope.filterDashboards(1);
          expect(actual).to.have.length(3);
          expect(actual[0]).to.be('index-a/path-a1/index-a/path-a2');
          expect(actual[1]).to.be('index-b/path-b/index-c/path-c');
          expect(actual[2].dashboards).to.eql([ 'Db', 'Dc' ]);
          expect(actual[2].relation).to.be('index-b/path-b/index-c/path-c');
          done();
        }).catch(done);
      });

      it('should support dashboards recommendation connected with a loop', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a1'
                },
                {
                  indexPatternId: 'index-a',
                  path: 'path-a2'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', 'Da1' ]
            }
          ]
        };
        var map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(1);
          expect($scope.filterDashboards(0, { value: 'Da1' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Da2' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Db' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Dc' })).to.be(true);
          done();
        }).catch(done);
      });

      it('should only recommend connected dashboards', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel-a-b'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel-b-c'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', 'Dc' ]
            }
          ]
        };
        var map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(1);
          expect($scope.filterDashboards(0, { value: 'Da1' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Da2' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Db' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Dc' })).to.be(true);
          done();
        }).catch(done);
      });

      it('should filter dashboards based on the selected relation', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Db', '' ],
              relation: 'index-a/path-a/index-b/path-b'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterDashboards(0, { value: 'Da1' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Da2' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Db' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Dc' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Dd' })).to.be(true);
          done();
        }).catch(done);
      });

      it('should filter relation depending on the row', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Db', '' ]
            },
            {
              dashboards: [ 'Dc', '' ]
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations(0, { value: 'index-a/path-a/index-b/path-b' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-b/path-b/index-c/path-c' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-c/path-c/index-d/path-d' })).to.be(true);
          expect($scope.filterRelations(1, { value: 'index-a/path-a/index-b/path-b' })).to.be(true);
          expect($scope.filterRelations(1, { value: 'index-b/path-b/index-c/path-c' })).to.be(false);
          expect($scope.filterRelations(1, { value: 'index-c/path-c/index-d/path-d' })).to.be(false);
          done();
        }).catch(done);
        $timeout.flush();
      });

      it('should filter possible dashboards based on the selected relation', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', '' ],
              relation: 'index-a/path-a/index-b/path-b'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db1', 'Db2' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterDashboards(0, { value: 'Da1' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Da2' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Db1' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Db2' })).to.be(false);
          expect($scope.filterDashboards(0, { value: 'Dc' })).to.be(true);
          expect($scope.filterDashboards(0, { value: 'Dd' })).to.be(true);
          done();
        }).catch(done);
      });

      it('should test for the watched value of filterRelations', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel1',
              id: 'index-a/path-a/index-b/path-b'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel2',
              id: 'index-b/path-b/index-c/path-c'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel3',
              id: 'index-c/path-c/index-d/path-d'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', '' ]
            },
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a/path-a/index-b/path-b'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations(1)).to.eql([
            'index-a/path-a/index-b/path-b',
            'index-b/path-b/index-c/path-c',
            'index-c/path-c/index-d/path-d',
            'rel1',
            'rel2',
            'rel3',
            'Da',
            'Db'
          ]);
          done();
        }).catch(done);
      });

      it('should not filter if no dashboard is selected', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', '' ]
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations(0, { value: 'index-a/path-a/index-b/path-b' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-b/path-b/index-c/path-c' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-c/path-c/index-d/path-d' })).to.be(false);
          done();
        }).catch(done);
      });

      it('should return only the relations adjacent to a dashboard', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', 'Dc' ]
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations(0, { value: 'index-a/path-a/index-b/path-b' })).to.be(true);
          expect($scope.filterRelations(0, { value: 'index-b/path-b/index-c/path-c' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-c/path-c/index-d/path-d' })).to.be(false);
          done();
        }).catch(done);
        $timeout.flush();
      });

      it('should support relations that have the same label 1', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a1'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b1'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a2'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b2'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                },
                {
                  indexPatternId: 'index-d',
                  path: 'path-d'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', 'Db' ]
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations(0, { value: 'index-a/path-a1/index-b/path-b1' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-a/path-a2/index-b/path-b2' })).to.be(false);
          expect($scope.filterRelations(0, { value: 'index-c/path-c/index-d/path-d' })).to.be(true);
          done();
        }).catch(done);
        $timeout.flush();
      });

      it('should support relations that have the same label 2', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a1'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b1'
                }
              ],
              label: 'rel'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a2'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b2'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a/path-a1/index-a/path-b1'
            },
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a/path-a2/index-a/path-b2'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(2);
          expect($scope.relations.relationsDashboards[0].error).to.be('');
          expect($scope.relations.relationsDashboards[1].error).to.be('');
          done();
        }).catch(done);
      });

      it('should throw an error if two dashboards are connected via a same relation', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a/path-a/index-a/path-b'
            },
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a/path-a/index-a/path-b'
            }
          ]
        };
        var map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(2);
          expect($scope.relations.relationsDashboards[0].error).to.be('These relationships are equivalent, please remove one');
          expect($scope.relations.relationsDashboards[1].error).to.be('These relationships are equivalent, please remove one');
          done();
        }).catch(done);
      });
    });
  });
});
