describe('Kibi Settings', function () {
  const sinon = require('auto-release-sinon');
  const ngMock = require('ngMock');
  const expect = require('expect.js');
  const _ = require('lodash');
  const Promise = require('bluebird');
  const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
  const jQuery = require('jquery');

  let $scope;
  let config;
  let indexToDashboardMapPromise;
  let unbind = [];

  function init({ digest = true, mappings, savedDashboards, savedSearches, indexToDashboardsMap, relations, events } = {}) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', 'dashboard');
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', savedSearches || []));
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => {
        return mockSavedObjects(Promise, Private)('savedDashboards', savedDashboards || []);
      });
    });

    ngMock.inject(function ($injector, $rootScope, $controller, Private) {
      if (mappings) {
        const es = $injector.get('es');
        const stub = sinon.stub(es.indices, 'getFieldMapping');
        _.each(mappings, ({ indices, type = [], path, mappings }) => {
          stub.withArgs(
            sinon.match.has('index', indices)
            .and(sinon.match.has('type', type))
            .and(sinon.match.has('field', [ path ]))
          ).returns(Promise.resolve(mappings));
        });
      }

      indexToDashboardMapPromise = Promise.resolve(indexToDashboardsMap);

      config = $injector.get('config');
      config.set('kibi:relations', relations);

      $scope = $rootScope;
      const el = '<div><form name="dashboardsForm" class="ng-valid"/><form name="indicesForm" class="ng-valid"/></div>';
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
      if (digest) {
        $scope.$digest();
      }
    });
  }

  function after() {
    _.each(unbind, function (off) {
      off();
    });
    unbind = [];
  }

  describe('Relations Section', function () {

    it('relations should have version set to 2 by default', function (done) {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.inject(($injector) => {
        config = $injector.get('config');
        expect(config.get('kibi:relations').version).to.be(2);
        done();
      });
    });

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

      it('should return the expected dashboards/index associations',
        function (done) {
          const expected = {
            'search-ste': ['search-ste'],
            'time-testing-4': ['time-testing-4']
          };

          $scope.getIndexToDashboardMap().then(function (results) {
            expect(results, expected);
            done();
          }).catch(done);
        }
      );
    });

    describe('update graph', function () {
      it('should import the existing serialized graph if it contains nodes', function () {
        const relations = {
          relationsIndicesSerialized: {
            options: {
              colors: {}
            },
            nodes: [ 'my node' ]
          },
          relationsIndices: [ {} ]
        };

        init({ relations, digest: false });

        $scope.updateGraph({
          name: 'indices',
          getSourceNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'source_type'
            };
          },
          getTargetNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'target_type'
            };
          },
          getLink(relation) {
            return {
              source: 'source',
              target: 'target',
              linkType: 'link',
              undirected: true
            };
          }
        });

        // since the serialized graph has a node and it is the first load, it is loaded directly
        expect($scope.indicesGraph.options.colors.source_type).to.not.be.ok();
        expect($scope.indicesGraph.options.colors.target_type).to.not.be.ok();
      });

      it('should not import the existing serialized graph if it does not have nodes', function () {
        const relations = {
          relationsIndicesSerialized: {
            options: {
              colors: {}
            },
            nodes: []
          },
          relationsIndices: [ {} ]
        };

        init({ relations, digest: false });

        $scope.updateGraph({
          name: 'indices',
          getSourceNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'source_type'
            };
          },
          getTargetNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'target_type'
            };
          },
          getLink(relation) {
            return {
              source: 'source',
              target: 'target',
              linkType: 'link',
              undirected: true
            };
          }
        });

        // since nodes of the serialized graph is empty, the relations are processed
        expect($scope.indicesGraph.options.colors.source_type).to.be.ok();
        expect($scope.indicesGraph.options.colors.target_type).to.be.ok();
      });

      it('should not import the existing serialized graph if not the first load', function () {
        const relations = {
          relationsIndicesSerialized: {
            options: {
              colors: {}
            },
            nodes: [ 'my node' ],
            links: []
          },
          relationsIndices: [ {} ]
        };

        init({ relations, digest: false });

        $scope.indicesGraph = {}; // just so it is not falsy

        $scope.updateGraph({
          name: 'indices',
          getSourceNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'source_type'
            };
          },
          getTargetNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'target_type'
            };
          },
          getLink(relation) {
            return {
              source: 'source',
              target: 'target',
              linkType: 'link',
              undirected: true
            };
          }
        });

        // since this is not the first load, the relations are processed
        expect($scope.indicesGraph.options.colors.source_type).to.be.ok();
        expect($scope.indicesGraph.options.colors.target_type).to.be.ok();
      });

      it('should populate colors correctly', function () {
        const relations = {
          relationsIndices: [ {} ]
        };

        init({ relations, digest: false });
        $scope.updateGraph({
          name: 'indices',
          options: {
            colors: {}
          },
          getSourceNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'source_type'
            };
          },
          getTargetNode(relation) {
            return {
              id: 'id',
              label: 'label',
              nodeType: 'target_type'
            };
          },
          getLink(relation) {
            return {
              source: 'source',
              target: 'target',
              linkType: 'link',
              undirected: true
            };
          }
        });

        expect($scope.indicesGraph.options.colors.source_type).to.be.ok();
        expect($scope.indicesGraph.options.colors.target_type).to.be.ok();
      });
    });

    describe('index patterns graph', function () {

      afterEach(after);

      it('should not update the graph', function () {
        init({ digest: false });

        const updateGraphStub = sinon.stub($scope, 'updateGraph');
        const diff1 = [
          {
            indices: [
              {
                indexPatternId: '',
                path: 'p1'
              },
              {
                indexPatternId: 'i2',
                path: 'p2'
              }
            ]
          }
        ];
        const diff2 = [
          {
            indices: [
              {
                indexPatternId: 'i1',
                path: ''
              },
              {
                indexPatternId: 'i2',
                path: 'p2'
              }
            ]
          }
        ];
        const diff3 = [
          {
            indices: [
              {
                indexPatternId: 'i1',
                path: 'p1'
              },
              {
                indexPatternId: '',
                path: 'p2'
              }
            ]
          }
        ];
        const diff4 = [
          {
            indices: [
              {
                indexPatternId: 'i1',
                path: 'p1'
              },
              {
                indexPatternId: 'i2',
                path: ''
              }
            ]
          }
        ];

        $scope.updateIndicesGraph(null, diff1);
        sinon.assert.notCalled(updateGraphStub);
        updateGraphStub.reset();

        $scope.updateIndicesGraph(null, diff2);
        sinon.assert.notCalled(updateGraphStub);
        updateGraphStub.reset();

        $scope.updateIndicesGraph(null, diff3);
        sinon.assert.notCalled(updateGraphStub);
        updateGraphStub.reset();

        $scope.updateIndicesGraph(null, diff4);
        sinon.assert.notCalled(updateGraphStub);
      });

      it('should create the graph of indices', function () {
        const relations = {
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
          expect(relation.errors).to.have.length(0);
        });
      });

      describe('check field mapping for the siren-join', function () {
        require('testUtils/noDigestPromises').activateForSuite();

        it('should throw an error if join fields do not have compatible mapping', function (done) {
          init({
            digest: false,
            relations: {
              relationsIndices: [
                {
                  indices: [
                    { indexPatternId: 'index-a', path: 'path-a' },
                    { indexPatternId: 'index-b', path: 'path-b' }
                  ],
                  label: 'rel 1'
                },
                {
                  indices: [
                    { indexPatternId: 'index-a', path: 'a1' },
                    { indexPatternId: 'index-b', path: 'b1' }
                  ],
                  label: 'rel 2'
                }
              ]
            },
            mappings: [
              {
                indices: [ 'index-a' ],
                path: 'path-a',
                mappings: {
                  'index-a': {
                    mappings: {
                      'type-a': {
                        'path-a': {
                          full_name: 'path-a',
                          mapping: {
                            'path-a': {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'index-a' ],
                path: 'a1',
                mappings: {
                  'index-a': {
                    mappings: {
                      'type-a': {
                        a1: {
                          full_name: 'a1',
                          mapping: {
                            a1: {
                              type: 'string',
                              index: 'analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'index-b' ],
                path: 'path-b',
                mappings: {
                  'index-b': {
                    mappings: {
                      'type-b': {
                        'path-b': {
                          full_name: 'path-b',
                          mapping: {
                            'path-b': {
                              type: 'long',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'index-b' ],
                path: 'b1',
                mappings: {
                  'index-b': {
                    mappings: {
                      'type-b': {
                        b1: {
                          full_name: 'b1',
                          mapping: {
                            b1: {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            ]
          });
          $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(2);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/Incompatible/);
            });
            done();
          }).catch(done);
        });

        it('should support nested fields', function (done) {
          init({
            digest: false,
            relations: {
              relationsIndices: [
                {
                  indices: [
                    { indexPatternId: 'index-a', path: 'nested.path-a' },
                    { indexPatternId: 'index-b', path: 'nested.path-b' }
                  ],
                  label: 'rel 1'
                },
                {
                  indices: [
                    { indexPatternId: 'index-a', path: 'a1' },
                    { indexPatternId: 'index-b', path: 'b1' }
                  ],
                  label: 'rel 2'
                }
              ]
            },
            mappings: [
              {
                indices: [ 'index-a' ],
                path: 'nested.path-a',
                mappings: {
                  'index-a': {
                    mappings: {
                      'type-a': {
                        'nested.path-a': {
                          full_name: 'nested.path-a',
                          mapping: {
                            'path-a': {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'index-a' ],
                path: 'a1',
                mappings: {
                  'index-a': {
                    mappings: {
                      'type-a': {
                        a1: {
                          full_name: 'a1',
                          mapping: {
                            a1: {
                              type: 'string',
                              index: 'analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'index-b' ],
                path: 'nested.path-b',
                mappings: {
                  'index-b': {
                    mappings: {
                      'type-b': {
                        'nested.path-b': {
                          full_name: 'nested.path-b',
                          mapping: {
                            'path-b': {
                              type: 'long',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'index-b' ],
                path: 'b1',
                mappings: {
                  'index-b': {
                    mappings: {
                      'type-b': {
                        b1: {
                          full_name: 'b1',
                          mapping: {
                            b1: {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            ]
          });
          $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(2);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/Incompatible/);
            });
            done();
          }).catch(done);
        });

        it('should support index patterns 1', function (done) {
          init({
            digest: false,
            relations: {
              relationsIndices: [
                {
                  indices: [
                    { indexPatternId: 'a*', path: 'path-a' },
                    { indexPatternId: 'b', path: 'path-b' }
                  ],
                  label: 'rel 1'
                }
              ]
            },
            mappings: [
              {
                indices: [ 'a*' ],
                path: 'path-a',
                mappings: {
                  'a1': {
                    mappings: {
                      'type-a': {
                        'path-a': {
                          full_name: 'path-a',
                          mapping: {
                            'path-a': {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  },
                  'a2': {
                    mappings: {
                      'type-a': {
                        'path-a': {
                          full_name: 'path-a',
                          mapping: {
                            'path-a': {
                              type: 'string',
                              index: 'analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'b' ],
                path: 'path-b',
                mappings: {
                  'b': {
                    mappings: {
                      'type-b': {
                        'path-b': {
                          full_name: 'path-b',
                          mapping: {
                            'path-b': {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            ]
          });
          $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(1);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/differ on some indices matching the pattern a\*/);
            });
            done();
          }).catch(done);
        });

        it('should support index patterns 2', function (done) {
          init({
            digest: false,
            relations: {
              relationsIndices: [
                {
                  indices: [
                    { indexPatternId: 'a', path: 'path-a' },
                    { indexPatternId: 'b*', path: 'path-b' }
                  ],
                  label: 'rel 1'
                }
              ]
            },
            mappings: [
              {
                indices: [ 'a' ],
                path: 'path-a',
                mappings: {
                  'a': {
                    mappings: {
                      'type-a': {
                        'path-a': {
                          full_name: 'path-a',
                          mapping: {
                            'path-a': {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                indices: [ 'b*' ],
                path: 'path-b',
                mappings: {
                  'b1': {
                    mappings: {
                      'type-b': {
                        'path-b': {
                          full_name: 'path-b',
                          mapping: {
                            'path-b': {
                              type: 'string',
                              index: 'not_analyzed'
                            }
                          }
                        }
                      }
                    }
                  },
                  'b2': {
                    mappings: {
                      'type-b': {
                        'path-b': {
                          full_name: 'path-b',
                          mapping: {
                            'path-b': {
                              type: 'string',
                              index: 'analyzed'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            ]
          });
          $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(1);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/differ on some indices matching the pattern b\*/);
            });
            done();
          }).catch(done);
        });
      });

      it('should throw an error if there are duplicates', function () {
        const relations = {
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
          expect(relation.errors).to.eql([ 'These relationships are equivalent, please remove one.' ]);
        });
      });

      it('should create a unique ID for the relation', function () {
        const relations = {
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
        const relations = {
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
              errors: []
            }
          ]
        };

        const options = {
          relations: relations,
          events: {
            'change:config.kibi:relations': function (event, relations) {
              _.each(relations.relationsIndices, function (relation) {
                expect(relation.errors).to.be(undefined);
                expect(relation.label).not.to.be(undefined);
                expect(relation.indices).not.to.be(undefined);
              });
              done();
            }
          }
        };

        init(options);
        $scope.submit();
      });
    });

    describe('dashboards graph', function () {
      it('should not update the graph', function () {
        init({ digest: false });

        const updateGraphStub = sinon.stub($scope, 'updateGraph');
        const diff1 = [
          {
            relation: 'rel',
            dashboards: [ 'd1', '' ]
          }
        ];
        const diff2 = [
          {
            relation: 'rel',
            dashboards: [ '', 'd2' ]
          }
        ];
        const diff3 = [
          {
            relation: '',
            dashboards: [ 'd1', 'd2' ]
          }
        ];

        $scope._updateRelationsDashboards(null, diff1);
        sinon.assert.notCalled(updateGraphStub);
        updateGraphStub.reset();

        $scope._updateRelationsDashboards(null, diff2);
        sinon.assert.notCalled(updateGraphStub);
        updateGraphStub.reset();

        $scope._updateRelationsDashboards(null, diff3);
        sinon.assert.notCalled(updateGraphStub);
      });

      it('should remove all if all components are defined - what is retained is up to kibi-select', function (done) {
        const relations = {
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
              id: 'index-a//path-a1/index-a//path-a2',
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
              id: 'index-b//path-b/index-c//path-c',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da2', 'Da1' ],
              relation: 'index-a//path-a1/index-a//path-a2'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(1);
          expect($scope.filterDashboards({ value: 'Da1' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Da2' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Db' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Dc' }, {rowIndex: 0}, false)).to.be(true);
          done();
        });
      });

      it('should test for the watched value of filterDashboards', function (done) {
        const relations = {
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
              relation: 'index-a//path-a1/index-a//path-a2'
            },
            {
              dashboards: [ 'Db', 'Dc' ],
              relation: 'index-b//path-b/index-c//path-c'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(2);
          const actual = $scope.filterDashboards(null, {rowIndex: 1}, false);
          expect(actual).to.have.length(4);
          expect(actual[0]).to.be('index-a//path-a1/index-a//path-a2');
          expect(actual[1]).to.be('index-b//path-b/index-c//path-c');
          expect(actual[2].dashboards).to.eql([ 'Db', 'Dc' ]);
          expect(actual[3]).to.be(map);
          done();
        }).catch(done);
      });

      it('should support dashboards recommendation connected with a loop', function (done) {
        const relations = {
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
              id: 'index-a//path-a1/index-a//path-a2',
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
              id: 'index-b//path-b/index-c//path-c',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', 'Da1' ]
            }
          ]
        };
        const map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(1);
          expect($scope.filterDashboards({ value: 'Da1' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Da2' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Db' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Dc' }, {rowIndex: 0}, false)).to.be(true);
          done();
        }).catch(done);
      });

      it('should only recommend connected dashboards', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
              label: 'rel-b-c'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', 'Dc' ]
            }
          ]
        };
        const map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(1);
          expect($scope.filterDashboards({ value: 'Da1' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Da2' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Db' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Dc' }, {rowIndex: 0}, false)).to.be(true);
          done();
        }).catch(done);
      });

      it('should NOT filter dashboard when it is already selected', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', '' ],
              relation: ''
            },
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ]
        };
        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterDashboards({ value: 'Da' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Da' }, {rowIndex: 0}, undefined)).to.be(true);
          // but if already selected it should not be filter out
          expect($scope.filterDashboards({ value: 'Da' }, {rowIndex: 0}, true)).to.be(false);
          done();
        }).catch(done);

      });

      it('should filter dashboards based on the selected relation', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
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
              id: 'index-c//path-c/index-d//path-d',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Db', '' ],
              relation: 'index-a//path-a/index-b//path-b'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterDashboards({ value: 'Da1' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Da2' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Db' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Dc' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Dd' }, {rowIndex: 0}, false)).to.be(true);
          done();
        }).catch(done);
      });

      it('should NOT filter relation when it is already selected', function (done) {
        const relations = {
          relationsIndices: [{
            indices: [{
              indexPatternId: 'index-a',
              path: 'path-a'
            }, {
              indexPatternId: 'index-b',
              path: 'path-b'
            }],
            id: 'index-a//path-a/index-b//path-b',
            label: 'rel'
          }, {
            indices: [{
              indexPatternId: 'index-b',
              path: 'path-b'
            }, {
              indexPatternId: 'index-c',
              path: 'path-c'
            }],
            id: 'index-b//path-b/index-c//path-c',
            label: 'rel'
          }, {
            indices: [{
              indexPatternId: 'index-c',
              path: 'path-c'
            }, {
              indexPatternId: 'index-d',
              path: 'path-d'
            }],
            id: 'index-c//path-c/index-d//path-d',
            label: 'rel'
          }],
          relationsDashboards: [
            {
              dashboards: ['Da', '']
            }
          ]
        };
        const map = {
          'index-a': ['Da'],
          'index-b': ['Db'],
          'index-c': ['Dc']
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, { rowIndex: 0 }, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, { rowIndex: 0 }, undefined)).to.be(false);
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, { rowIndex: 0 }, true)).to.be(false);

          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, { rowIndex: 0 }, false)).to.be(true);
          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, { rowIndex: 0 }, undefined)).to.be(true);
          // here normally it should be filtered out but not when it was already selected
          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, { rowIndex: 0 }, true)).to.be(false);
          done();
        }).catch(done);
      });

      it('should filter relation that already appear between two dashboards in case of a multiedge graph', function (done) {
        const relations = {
          relationsIndices: [
            {
              indices: [ { indexPatternId: 'index-a', path: 'path-a1' }, { indexPatternId: 'index-b', path: 'path-b' } ],
              id: 'index-a//path-a1/index-b//path-b',
              label: 'rel'
            },
            {
              indices: [ { indexPatternId: 'index-a', path: 'path-a2' }, { indexPatternId: 'index-b', path: 'path-b' } ],
              id: 'index-a//path-a2/index-b//path-b',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Db', 'Da' ],
              relation: 'index-a//path-a1/index-b//path-b'
            },
            {
              dashboards: [ 'Db', 'Da' ]
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations({ value: 'index-a//path-a1/index-b//path-b' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-a//path-a1/index-b//path-b' }, {rowIndex: 1}, false)).to.be(true);
          expect($scope.filterRelations({ value: 'index-a//path-a2/index-b//path-b' }, {rowIndex: 1}, false)).to.be(false);
          done();
        }).catch(done);
      });

      it('should filter relation depending on the row', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
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
              id: 'index-c//path-c/index-d//path-d',
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
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-c//path-c/index-d//path-d' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, {rowIndex: 1}, false)).to.be(true);
          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, {rowIndex: 1}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-c//path-c/index-d//path-d' }, {rowIndex: 1}, false)).to.be(false);
          done();
        }).catch(done);
      });

      it('should filter possible dashboards based on the selected relation', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
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
              id: 'index-c//path-c/index-d//path-d',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', '' ],
              relation: 'index-a//path-a/index-b//path-b'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da1', 'Da2' ],
          'index-b': [ 'Db1', 'Db2' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterDashboards({ value: 'Da1' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Da2' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Db1' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Db2' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterDashboards({ value: 'Dc' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterDashboards({ value: 'Dd' }, {rowIndex: 0}, false)).to.be(true);
          done();
        }).catch(done);
      });

      it('should test for the watched value of filterRelations', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b'
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
              id: 'index-b//path-b/index-c//path-c'
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
              id: 'index-c//path-c/index-d//path-d'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', '' ]
            },
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a//path-a/index-b//path-b'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations(null, {rowIndex: 1}, undefined)).to.eql([
            'index-a//path-a/index-b//path-b',
            'index-b//path-b/index-c//path-c',
            'index-c//path-c/index-d//path-d',
            'rel1',
            'rel2',
            'rel3',
            'Da',
            'Db',
            map
          ]);
          done();
        }).catch(done);
      });

      it('should not filter if no dashboard is selected', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
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
              id: 'index-c//path-c/index-d//path-d',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', '' ]
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, {rowIndex: 0})).to.be(false);
          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, {rowIndex: 0})).to.be(false);
          expect($scope.filterRelations({ value: 'index-c//path-c/index-d//path-d' }, {rowIndex: 0})).to.be(false);
          done();
        }).catch(done);
      });

      it('should return only the relations adjacent to a dashboard', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
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
              id: 'index-b//path-b/index-c//path-c',
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
              id: 'index-c//path-c/index-d//path-d',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ '', 'Dc' ]
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations({ value: 'index-a//path-a/index-b//path-b' }, {rowIndex: 0}, false)).to.be(true);
          expect($scope.filterRelations({ value: 'index-b//path-b/index-c//path-c' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-c//path-c/index-d//path-d' }, {rowIndex: 0}, false)).to.be(false);
          done();
        }).catch(done);
      });

      it('should support relations that have the same label 1', function (done) {
        const relations = {
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
              id: 'index-a//path-a1/index-b//path-b1',
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
              id: 'index-a//path-a2/index-b//path-b2',
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
              id: 'index-c//path-c/index-d//path-d',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', 'Db' ]
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ],
          'index-c': [ 'Dc' ],
          'index-d': [ 'Dd' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.filterRelations({ value: 'index-a//path-a1/index-b//path-b1' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-a//path-a2/index-b//path-b2' }, {rowIndex: 0}, false)).to.be(false);
          expect($scope.filterRelations({ value: 'index-c//path-c/index-d//path-d' }, {rowIndex: 0}, false)).to.be(true);
          done();
        }).catch(done);
      });

      it('should support relations that have the same label 2', function (done) {
        const relations = {
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
              id: 'index-a//path-a1/index-b//path-b1',
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
              id: 'index-a//path-a2/index-b//path-b2',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a//path-a1/index-a//path-b1'
            },
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a//path-a2/index-a//path-b2'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(2);
          expect($scope.relations.relationsDashboards[0].errors).to.have.length(0);
          expect($scope.relations.relationsDashboards[1].errors).to.have.length(0);
          done();
        }).catch(done);
      });

      it('should throw an error if two dashboards are connected via a same relation', function (done) {
        const relations = {
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
              id: 'index-a//path-a/index-b//path-b',
              label: 'rel'
            }
          ],
          relationsDashboards: [
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a//path-a/index-a//path-b'
            },
            {
              dashboards: [ 'Da', 'Db' ],
              relation: 'index-a//path-a/index-a//path-b'
            }
          ]
        };
        const map = {
          'index-a': [ 'Da' ],
          'index-b': [ 'Db' ]
        };

        init({ relations: relations, indexToDashboardsMap: map });
        indexToDashboardMapPromise.then(function () {
          expect($scope.relations.relationsDashboards).to.have.length(2);
          expect($scope.relations.relationsDashboards[0].errors).to.eql([ 'These relationships are equivalent, please remove one.' ]);
          expect($scope.relations.relationsDashboards[1].errors).to.eql([ 'These relationships are equivalent, please remove one.' ]);
          done();
        }).catch(done);
      });
    });

    describe('directives: kibiRelationsSearchBar', () => {
      let scope;
      let searchBar;

      beforeEach(() => {
        ngMock.module('apps/settings');
        ngMock.inject(($rootScope, $compile) => {
          scope = $rootScope.$new();
          searchBar = $compile('<input type="text" kibi-relations-search-bar ' +
            'kibi-relations-search-bar-path="relations.relationsIndices" ' +
            'ng-model="relationsIndicesSearchString" ng-model-options="{ debounce: 350 }" ' +
            'ng-change="searchRelations()">')(scope);
          scope.$digest();
        });
      });

      it('should search and filter the relations in settings', () => {
        searchBar.scope().relationsIndicesSearchString = 'art';
        searchBar.scope().relations = {
          relationsIndices: [
            {
              indices: [
                { indexPatternType: '', indexPatternId: 'investor' }
              ]
            },
            {
              indices: [
                { indexPatternType: '', indexPatternId: 'article' },
                { indexPatternType: '', indexPatternId: 'company' }
              ]
            },
            {
              indices: [
                {
                  rocket: [
                    {
                      engine: '',
                      computer: [
                        { cpu: '', software: 'artificial intelligence' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        };

        searchBar.scope().searchRelations();

        let relCounter = 0;
        _.get(searchBar.scope(), 'relations.relationsIndices').forEach((relation) => {
          if (!relation.$$hidden) relCounter++;
        });

        expect(relCounter).to.eql(2);
      });
    });

  });
});
