import RelationsHelperProvider from 'ui/kibi/helpers/relations_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';

let relationsHelper;
let $rootScope;

function init() {
  ngMock.module('kibana');
  ngMock.inject(function (_$rootScope_, Private) {
    $rootScope = _$rootScope_;
    relationsHelper = Private(RelationsHelperProvider);
  });
}

describe('Kibi Components', function () {
  describe('Relations Helper', function () {
    describe('relations init', function () {
      beforeEach(init);

      it('should init the relations on init:config event', function () {
        const relations = {
          relationsIndices: [
            {
              id: 'indexa/typea/patha/indexb//pathb',
              label: 'funky relation',
              indices: [
                { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
                { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
              ]
            }
          ],
          relationsDashboards: [
            {
              relation: 'indexa/typea/patha/indexb//pathb',
              dashboards: [ 'da', 'db' ]
            }
          ]
        };

        $rootScope.$emit('init:config', relations);
        $rootScope.$digest();
        expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: true, validDashboards: true });
      });

      it('should init the relations on change:config.kibi:relations event', function () {
        const relations = {
          relationsIndices: [
            {
              id: 'indexa/typea/patha/indexb//pathb',
              label: 'funky relation',
              indices: [
                { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
                { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
              ]
            }
          ],
          relationsDashboards: [
            {
              relation: 'indexa/typea/patha/indexb//pathb',
              dashboards: [ 'da', 'db' ]
            }
          ]
        };

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();
        expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: true, validDashboards: true });
      });
    });

    describe('validateIndicesRelationFromId', function () {
      beforeEach(init);
      beforeEach(function () {
        const relations = {
          relationsIndices: [
            {
              id: 'indexa/typea/patha/indexb//pathb',
              label: 'funky relation',
              indices: [
                { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
                { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
              ]
            },
            {
              id: 'bad relation',
              label: 'funky relation',
              indices: [
                { indexPatternId: '', indexPatternType: '', path: '' },
                { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
              ]
            }
          ]
        };

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();
      });

      it('should pass if the relation is correct', function () {
        expect(relationsHelper.validateIndicesRelationFromId('indexa/typea/patha/indexb//pathb')).to.be(true);
      });

      it('should fail if the relation is missing', function () {
        expect(relationsHelper.validateIndicesRelationFromId('nope')).to.be(false);
      });

      it('should fail if the relation is incorrect', function () {
        expect(relationsHelper.validateIndicesRelationFromId('bad relation')).to.be(false);
      });
    });

    describe('checkIfRelationsAreValid', function () {
      beforeEach(init);

      it('should pass if relations are correct', function () {
        const relations = {
          relationsIndices: [
            {
              id: 'indexa/typea/patha/indexb//pathb',
              label: 'funky relation',
              indices: [
                {
                  indexPatternId: 'indexa',
                  indexPatternType: 'typea',
                  path: 'patha'
                },
                {
                  indexPatternId: 'indexb',
                  indexPatternType: '',
                  path: 'pathb'
                }
              ]
            }
          ],
          relationsDashboards: [
            {
              relation: 'indexa/typea/patha/indexb//pathb',
              dashboards: [ 'da', 'db' ]
            }
          ]
        };

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();
        expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: true, validDashboards: true });
      });

      describe('relationsIndices', function () {
        it('should fail if the ID does not have 6 parts', function () {
          const relations = {
            relationsIndices: [
              {
                id: 'indexa/patha/indexb/pathb',
                label: 'funky relation',
                indices: [
                  {
                    indexPatternId: 'indexa',
                    indexPatternType: 'typea',
                    path: 'patha'
                  },
                  {
                    indexPatternId: 'indexb',
                    indexPatternType: '',
                    path: 'pathb'
                  }
                ]
              }
            ],
            relationsDashboards: []
          };

          $rootScope.$emit('change:config.kibi:relations', relations);
          $rootScope.$digest();
          expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: false, validDashboards: true });
        });

        it('should fail if the ID does not appear in the indices', function () {
          const relations = {
            relationsIndices: [
              {
                id: 'indexa/typea/patha/indexb//pathb',
                label: 'funky relation',
                indices: [
                  {
                    indexPatternId: 'indexa',
                    indexPatternType: '',
                    path: 'patha'
                  },
                  {
                    indexPatternId: 'indexb',
                    indexPatternType: '',
                    path: 'pathb'
                  }
                ]
              }
            ],
            relationsDashboards: []
          };

          $rootScope.$emit('change:config.kibi:relations', relations);
          $rootScope.$digest();
          expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: false, validDashboards: true });
        });

        it('should fail if the label is undefined', function () {
          const relations = {
            relationsIndices: [
              {
                id: 'indexa/typea/patha/indexb//pathb',
                label: '',
                indices: [
                  {
                    indexPatternId: 'indexa',
                    indexPatternType: 'typea',
                    path: 'patha'
                  },
                  {
                    indexPatternId: 'indexb',
                    indexPatternType: '',
                    path: 'pathb'
                  }
                ]
              }
            ],
            relationsDashboards: []
          };

          $rootScope.$emit('change:config.kibi:relations', relations);
          $rootScope.$digest();
          expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: false, validDashboards: true });
        });

        it('should fail if the indices array has the incorrect number of indices', function () {
          const relations = {
            relationsIndices: [
              {
                id: 'indexa/typea/patha/indexb//pathb',
                label: 'label',
                indices: [
                  {
                    indexPatternId: 'indexb',
                    indexPatternType: '',
                    path: 'pathb'
                  }
                ]
              }
            ],
            relationsDashboards: []
          };

          $rootScope.$emit('change:config.kibi:relations', relations);
          $rootScope.$digest();
          expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: false, validDashboards: true });
        });

        it('should fail if the indices array is incorrect', function () {
          const relations = {
            relationsIndices: [
              {
                id: 'indexa/typea/patha/indexb//pathb',
                label: 'label',
              }
            ],
            relationsDashboards: []
          };
          const indicesTest = [
            [
              { indexPatternId: '', indexPatternType: 'typea', path: 'patha' },
              { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
            ],
            [
              { indexPatternId: 'indexa', indexPatternType: 'typea', path: '' },
              { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
            ],
            [
              { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
              { indexPatternId: '', indexPatternType: '', path: 'pathb' }
            ],
            [
              { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
              { indexPatternId: 'indexb', indexPatternType: '', path: '' }
            ]
          ];
          indicesTest.forEach((indices) => {
            relations.relationsIndices[0].indices = indices;
            $rootScope.$emit('change:config.kibi:relations', relations);
            $rootScope.$digest();
            expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: false, validDashboards: true });
          });
        });
      });

      describe('relationsDashboards', function () {
        it('should fail if the relation ID is missing or duplicated', function () {
          const relation1 = {
            id: 'indexa/typea/patha/indexb//pathb',
            label: 'label',
            indices: [
              { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
              { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
            ]
          };
          const relations = {
            relationsIndices: [
              // duplicates
              relation1, relation1
            ],
            relationsDashboards: [
              {
                dashboards: [ 'da', 'db' ]
              }
            ]
          };

          [
            'indexa/patha/indexb/pathb',
            'indexa/typea/patha/indexb//pathb'
          ].forEach((id) => {
            relations.relationsDashboards[0].relation = id;
            $rootScope.$emit('change:config.kibi:relations', relations);
            $rootScope.$digest();
            expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: true, validDashboards: false });
          });
        });

        it('should fail if there are more than 2 connected dashboards', function () {
          const relations = {
            relationsIndices: [
              {
                id: 'indexa/typea/patha/indexb//pathb',
                label: 'label',
                indices: [
                  { indexPatternId: 'indexa', indexPatternType: 'typea', path: 'patha' },
                  { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
                ]
              }
            ],
            relationsDashboards: [
              {
                relation: 'indexa/typea/patha/indexb//pathb'
              }
            ]
          };

          [
            [], [ 'da' ], [ 'da', 'db', 'dc' ]
          ].forEach((dashboards) => {
            relations.relationsDashboards[0].dashboards = dashboards;
            $rootScope.$emit('change:config.kibi:relations', relations);
            $rootScope.$digest();
            expect(relationsHelper.checkIfRelationsAreValid()).to.eql({ validIndices: true, validDashboards: false });
          });
        });
      });
    });

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

      it('should get the correct relation details', function () {
        const indexa = 'ia';
        const typea = 'ta';
        const patha = 'pa';
        const indexb = 'ib';
        const typeb = 'tb';
        const pathb = 'pb';

        const id = relationsHelper.getJoinIndicesUniqueID(indexa, typea, patha, indexb, typeb, pathb);
        expect(relationsHelper.getRelationInfosFromRelationID(id))
        .to.eql({
          source: {
            index: indexa,
            type: typea,
            path: patha
          },
          target: {
            index: indexb,
            type: typeb,
            path: pathb
          }
        });
      });

      it('should manage the special keywords correctly', function () {
        const indexa = 'i/a';
        const typea = 't/a';
        const patha = 'p/a';
        const indexb = 'i/b';
        const typeb = 't/b';
        const pathb = 'p/b';

        const id = relationsHelper.getJoinIndicesUniqueID(indexa, typea, patha, indexb, typeb, pathb);
        expect(relationsHelper.getRelationInfosFromRelationID(id))
        .to.eql({
          source: {
            index: indexa,
            type: typea,
            path: patha
          },
          target: {
            index: indexb,
            type: typeb,
            path: pathb
          }
        });
      });

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

        $rootScope.$emit('change:config.kibi:relations', relations);
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

        $rootScope.$emit('change:config.kibi:relations', relations);
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

        $rootScope.$emit('change:config.kibi:relations', relations);
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


      it('should set limit to default one if not present', function () {
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

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();

        relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
        expect(relation1.limit).to.be(1000000);
      });

      it('should set limit to default one if present but equal -1', function () {
        const relations = {
          relationsIndices: [
            {
              limit: -1,
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

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();

        relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
        expect(relation1.limit).to.be(1000000);
      });

      it('should set limit to the correct value', function () {
        const relations = {
          relationsIndices: [
            {
              limit: 123456,
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

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();

        relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
        expect(relation1.limit).to.be(123456);
      });

    });
  });
});

