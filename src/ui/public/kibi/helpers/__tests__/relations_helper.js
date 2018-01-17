import { RelationsHelperFactory } from 'ui/kibi/helpers/relations_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

let relationsHelper;
let $rootScope;
let config;

function init() {
  ngMock.module('kibana');
  ngMock.inject(function (_$rootScope_, Private, _config_) {
    $rootScope = _$rootScope_;
    relationsHelper = Private(RelationsHelperFactory);
    config = _config_;
  });
}

describe('Kibi Components', function () {
  describe('Relations Helper', function () {
    describe('getJoinIndicesUniqueID', function () {
      beforeEach(init);

      it('should compute the relation unique ID', function () {
        const indexa = 'ia';
        const typea = 'ta';
        const patha = 'pa';
        const indexb = 'ib';
        const typeb = 'tb';
        const pathb = 'pb';
        const id = `${indexa}/${typea}/${patha}/${indexb}/${typeb}/${pathb}`;

        expect(relationsHelper.getJoinIndicesUniqueID(indexa, typea, patha, indexb, typeb, pathb)).to.be(id);
      });

      it('should escape special keywords', function () {
        const id = 'i-slash-a/t-slash-a/p-slash-a/i-slash-b/t-slash-b/p-slash-b';

        expect(relationsHelper.getJoinIndicesUniqueID('i/a', 't/a', 'p/a', 'i/b', 't/b', 'p/b')).to.be(id);
      });
    });

    describe('getRelationInfosFromRelationID', function () {
      beforeEach(init);

      it('should escape special keywords', function () {
        const id = 'i-slash-a/t-slash-a/p-slash-a/i-slash-b/t-slash-b/p-slash-b';

        expect(relationsHelper.getJoinIndicesUniqueID('i/a', 't/a', 'p/a', 'i/b', 't/b', 'p/b')).to.be(id);
      });
    });

    describe('addAdvancedJoinSettingsToRelation', function () {
      beforeEach(init);

      it('should not fail if the relation is missing', function () {
        const relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'investor',
                  path: 'id'
                },
                {
                  indexPatternId: 'investment',
                  path: 'investorid'
                }
              ],
              label: 'by',
              id: 'investment/investorid/investor/id'
            }
          ]
        };
        const missingRelation = {
          relation: [
            {
              indices: [ 'company' ],
              path: 'id'
            },
            {
              indices: [ 'article' ],
              path: 'companies'
            }
          ]
        };

        $rootScope.$emit('change:config.siren:relations', relations);
        $rootScope.$digest();

        expect(relationsHelper.addAdvancedJoinSettingsToRelation).withArgs(missingRelation).to.be.ok();
        expect(Object.keys(missingRelation)).to.eql([ 'relation' ]);
      });

      it('should get advanced settings for the given relation', function () {
        const relations = {
          relationsIndices: [
            {
              type: 'INNER_JOIN',
              indices: [
                {
                  indexPatternId: 'investor',
                  path: 'id'
                },
                {
                  indexPatternId: 'investment',
                  path: 'investorid'
                }
              ],
              label: 'by',
              id: 'investment//investorid/investor//id'
            }
          ]
        };
        const relation1 = {
          relation: [
            {
              indices: [ 'investment' ],
              path: 'investorid'
            },
            {
              indices: [ 'investor' ],
              path: 'id'
            }
          ]
        };

        $rootScope.$emit('change:config.siren:relations', relations);
        $rootScope.$digest();

        relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
        expect(relation1.type).to.be('INNER_JOIN');

        const relation2 = {
          relation: [
            {
              indices: [ 'investor' ],
              path: 'id'
            },
            {
              indices: [ 'investment' ],
              path: 'investorid'
            }
          ]
        };
        relationsHelper.addAdvancedJoinSettingsToRelation(relation2);
        expect(relation2.type).to.be('INNER_JOIN');
      });

      it('should get advanced relation with the specified patterns', function () {
        const relations = {
          relationsIndices: [
            {
              type: 'INNER_JOIN',
              indices: [
                {
                  indexPatternId: 'weather-*',
                  path: 'forecast'
                },
                {
                  indexPatternId: 'forecast',
                  path: 'forecast'
                }
              ],
              label: 'label',
              id: 'forecast//forecast/weather-*//forecast'
            }
          ]
        };
        const relation1 = {
          relation: [
            {
              indices: [ 'forecast' ],
              path: 'forecast'
            },
            {
              indices: [ 'weather-2015-01', 'weather-2015-02' ],
              path: 'forecast'
            }
          ]
        };

        $rootScope.$emit('change:config.siren:relations', relations);
        $rootScope.$digest();

        relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'forecast', 'weather-*');
        expect(relation1.type).to.be('INNER_JOIN');

        const relation2 = {
          relation: [
            {
              indices: [ 'weather-2015-01', 'weather-2015-02' ],
              path: 'forecast'
            },
            {
              indices: [ 'forecast' ],
              path: 'forecast'
            }
          ]
        };
        relationsHelper.addAdvancedJoinSettingsToRelation(relation2, 'weather-*', 'forecast');
        expect(relation2.type).to.be('INNER_JOIN');
      });


      describe('task_timeout', function () {
        describe('set to 0 in Advanced Setting -> kibi:joinTaskTimeout', function () {
          describe('should NOT set it if', function () {
            it('not present in relation', function () {
              const relations = {
                relationsIndices: [
                  {
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(undefined);
            });

            it('present and equal -1 in relation', function () {
              const relations = {
                relationsIndices: [
                  {
                    task_timeout: -1,
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(undefined);
            });

            it('present and equal to 0 in relation', function () {
              const relations = {
                relationsIndices: [
                  {
                    task_timeout: 0,
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(undefined);
            });
          });

          describe('should set it if ', function () {
            it('if it is set in the relation and is a valid positive integer', function () {
              const relations = {
                relationsIndices: [
                  {
                    task_timeout: 123456,
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(123456);
            });
          });
        });

        describe('set to a valid positive integer in Advanced Setting -> kibi:joinTaskTimeout', function () {

          beforeEach(function () {
            sinon.stub(config, 'get', function (key) {
              if (key === 'siren:joinTaskTimeout') {
                return 123;
              } else if (key === 'truncate:maxHeight') {
                return 20;
              } else if(key === 'state:storeInSessionStorage') {
                return false;
              } else {
                throw new Error('Stub the key: ' + key);
              }
            });
          });

          afterEach(function () {
            config.get.restore();
          });

          describe('should NOT set it if ', function () {
            it('present and equal to 0 in relation', function () {
              const relations = {
                relationsIndices: [
                  {
                    task_timeout: 0, // zero means disable
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(undefined);
            });
          });

          describe('should set it if ', function () {

            it('not present in the relation', function () {
              const relations = {
                relationsIndices: [
                  {
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(123);

            });

            it('present in the relation and set to -1', function () {
              const relations = {
                relationsIndices: [
                  {
                    task_timeout: -1,
                    indices: [
                      {
                        indexPatternId: 'investor',
                        path: 'id'
                      },
                      {
                        indexPatternId: 'investment',
                        path: 'investorid'
                      }
                    ],
                    label: 'by',
                    id: 'investment//investorid/investor//id'
                  }
                ]
              };
              const relation1 = {
                relation: [
                  {
                    indices: [ 'investment' ],
                    path: 'investorid'
                  },
                  {
                    indices: [ 'investor' ],
                    path: 'id'
                  }
                ]
              };

              $rootScope.$emit('change:config.siren:relations', relations);
              $rootScope.$digest();

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
              expect(relation1.task_timeout).to.be(123);

            });

          });
        });
      });

    });
  });
});
