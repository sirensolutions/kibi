import noDigestPromises from 'test_utils/no_digest_promises';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';
import Promise from 'bluebird';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import jQuery from 'jquery';

describe('Kibi Management', function () {
  let $scope;
  let config;
  let unbind = [];

  function init({ digest = true, mappings, savedSearches, relations, events }) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', 'dashboard');
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', savedSearches || []));
    });

    ngMock.inject(function ($injector, $rootScope, $controller, Private) {
      if (mappings) {
        const es = $injector.get('es');
        const stub = sinon.stub(es.indices, 'getFieldMapping');
        _.each(mappings, ({ indices, type = [], path, mappings }) => {
          stub.withArgs(
            sinon.match.has('index', indices)
            .and(sinon.match.has('type', type))
            .and(sinon.match.has('fields', [ path ]))
          ).returns(Promise.resolve(mappings));
        });
      }

      config = $injector.get('config');
      config.set('kibi:relations', relations);

      $scope = $rootScope;
      const el = '<div><form name="indicesForm" class="ng-valid"/></div>';
      $controller('RelationsController', {
        $scope: $scope,
        $element: jQuery(el)
      });
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

    it('relations should have version set to 2 by default', function () {
      ngMock.module('kibana');
      ngMock.inject(($injector) => {
        config = $injector.get('config');
        config.remove('kibi:relations'); // make sure we get the default value for this setting
      });
      expect(config.get('kibi:relations').version).to.be(2);
    });

    describe('index patterns graph', function () {

      afterEach(after);

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

        init({ relations });
        _.each($scope.relations.relationsIndices, function (relation) {
          expect(relation.errors).to.have.length(0);
        });
      });

      describe('check field mapping for the siren-join', function () {
        noDigestPromises.activateForSuite();

        it('should throw an error if join fields do not have compatible mapping', function () {
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

          return $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(2);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/Incompatible/);
            });
          });
        });

        it('should support nested fields', function () {
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

          return $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(2);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/Incompatible/);
            });
          });
        });

        it('should support index patterns 1', function () {
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

          return $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(1);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/differ on some indices matching the pattern a\*/);
            });
          });
        });

        it('should support index patterns 2', function () {
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

          return $scope.updateIndicesGraph()
          .then(function () {
            expect($scope.relations.relationsIndices).to.have.length(1);
            _.each($scope.relations.relationsIndices, function (relation) {
              expect(relation.errors).to.have.length(1);
              expect(relation.errors[0]).to.match(/differ on some indices matching the pattern b\*/);
            });
          });
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

        init({ relations });
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

        init({ relations });
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
            'change:.config.investigate:relations': function (event, relations) {
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
        return $scope.saveObject();
      });
    });

    describe('directives: kibiRelationsSearchBar', () => {
      let scope;
      let searchBar;

      beforeEach(() => {
        ngMock.module('apps/management');
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
