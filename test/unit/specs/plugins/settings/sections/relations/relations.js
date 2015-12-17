define(function (require) {
  describe('Kibi Settings', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var Promise = require('bluebird');
    var $scope;
    var config;
    var jQuery = require('jquery');
    var indexToDashboardMapPromise;
    var unbind = [];

    function init(options) {
      module('kibana');

      inject(function ($injector, $rootScope, $controller, Private) {
        var urlHelper = Private(require('components/kibi/url_helper/url_helper'));
        indexToDashboardMapPromise = Promise.resolve(options.indexToDashboardsMap);
        var getIndexToDashboardMapStub = sinon.stub(urlHelper, 'getIndexToDashboardMap')
        .returns(indexToDashboardMapPromise);

        config = $injector.get('config');
        config.set('kibi:relations', options.relations);

        $scope = $rootScope;
        var el = '<div><form name="dashboardsForm" class="ng-valid"/><form name="indicesForm" class="ng-valid"/></div>';
        $controller('RelationsController', {
          $scope: $scope,
          $element: jQuery(el)
        });
        if (options.events) {
          _.each(options.events, function (func, e) {
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
            expect($scope.filterDashboards(0, 'Da1')).to.be(true);
            expect($scope.filterDashboards(0, 'Da2')).to.be(true);
            expect($scope.filterDashboards(0, 'Db')).to.be(true);
            expect($scope.filterDashboards(0, 'Dc')).to.be(true);
            done();
          });
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
            expect($scope.filterDashboards(0, 'Da1')).to.be(false);
            expect($scope.filterDashboards(0, 'Da2')).to.be(false);
            expect($scope.filterDashboards(0, 'Db')).to.be(true);
            expect($scope.filterDashboards(0, 'Dc')).to.be(true);
            done();
          });
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
            expect($scope.filterDashboards(0, 'Da1')).to.be(true);
            expect($scope.filterDashboards(0, 'Da2')).to.be(true);
            expect($scope.filterDashboards(0, 'Db')).to.be(false);
            expect($scope.filterDashboards(0, 'Dc')).to.be(true);
            done();
          });
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
            expect($scope.filterDashboards(0, 'Da1')).to.be(false);
            expect($scope.filterDashboards(0, 'Da2')).to.be(false);
            expect($scope.filterDashboards(0, 'Db')).to.be(true);
            expect($scope.filterDashboards(0, 'Dc')).to.be(true);
            expect($scope.filterDashboards(0, 'Dd')).to.be(true);
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
            expect($scope.filterRelations(0, 'index-a/path-a/index-b/path-b')).to.be(false);
            expect($scope.filterRelations(0, 'index-b/path-b/index-c/path-c')).to.be(false);
            expect($scope.filterRelations(0, 'index-c/path-c/index-d/path-d')).to.be(true);
            expect($scope.filterRelations(1, 'index-a/path-a/index-b/path-b')).to.be(true);
            expect($scope.filterRelations(1, 'index-b/path-b/index-c/path-c')).to.be(false);
            expect($scope.filterRelations(1, 'index-c/path-c/index-d/path-d')).to.be(false);
            done();
          }).catch(done);
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
            expect($scope.filterDashboards(0, 'Da1')).to.be(false);
            expect($scope.filterDashboards(0, 'Da2')).to.be(false);
            expect($scope.filterDashboards(0, 'Db1')).to.be(false);
            expect($scope.filterDashboards(0, 'Db2')).to.be(false);
            expect($scope.filterDashboards(0, 'Dc')).to.be(true);
            expect($scope.filterDashboards(0, 'Dd')).to.be(true);
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
            expect($scope.filterRelations(0, 'index-a/path-a/index-b/path-b')).to.be(false);
            expect($scope.filterRelations(0, 'index-b/path-b/index-c/path-c')).to.be(false);
            expect($scope.filterRelations(0, 'index-c/path-c/index-d/path-d')).to.be(false);
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
            expect($scope.filterRelations(0, 'index-a/path-a/index-b/path-b')).to.be(true);
            expect($scope.filterRelations(0, 'index-b/path-b/index-c/path-c')).to.be(false);
            expect($scope.filterRelations(0, 'index-c/path-c/index-d/path-d')).to.be(false);
            done();
          }).catch(done);
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
            expect($scope.filterRelations(0, 'index-a/path-a1/index-b/path-b1')).to.be(false);
            expect($scope.filterRelations(0, 'index-a/path-a2/index-b/path-b2')).to.be(false);
            expect($scope.filterRelations(0, 'index-c/path-c/index-d/path-d')).to.be(true);
            done();
          }).catch(done);
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
});
