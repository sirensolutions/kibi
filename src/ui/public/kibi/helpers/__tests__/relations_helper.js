import { RelationsHelperFactory } from 'ui/kibi/helpers/relations_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import _ from 'lodash';

let relationsHelper;
let $rootScope;
let config;

function init(relations = [], additionalStubsF = null) {
  ngMock.module('kibana');

  ngMock.module('kibana/ontology_client', function ($provide) {
    $provide.service('ontologyClient', function () {
      return {
        getRelations: function () {
          return Promise.resolve(relations);
        },
        getRelationById: function (relId) {
          return this.getRelations()
          .then((relations) => {
            return _.find(relations, 'id', relId);
          });
        }
      };
    });
  });

  ngMock.inject(function (_$rootScope_, Private, _config_) {
    $rootScope = _$rootScope_;
    relationsHelper = Private(RelationsHelperFactory);
    config = _config_;
  });

  if (additionalStubsF) {
    additionalStubsF();
  }
}

describe('Kibi Components', function () {
  describe('Relations Helper', function () {
    describe('getJoinIndicesUniqueID', function () {
      beforeEach(init);

      it('should compute the relation unique ID', function () {
        const indexa = 'ia';
        const patha = 'pa';
        const indexb = 'ib';
        const pathb = 'pb';
        const id = `${indexa}//${patha}/${indexb}//${pathb}`;

        expect(relationsHelper.getJoinIndicesUniqueID(indexa, patha, indexb, pathb)).to.be(id);
      });

      it('should escape special keywords', function () {
        const id = 'i-slash-a//p-slash-a/i-slash-b//p-slash-b';

        expect(relationsHelper.getJoinIndicesUniqueID('i/a', 'p/a', 'i/b', 'p/b')).to.be(id);
      });
    });

    describe('addAdvancedJoinSettingsToRelation', function () {

      it('should not fail if the relation is missing', function () {
        init();
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

        expect(relationsHelper.addAdvancedJoinSettingsToRelation).withArgs(missingRelation).to.be.ok();
        expect(Object.keys(missingRelation)).to.eql([ 'relation' ]);
      });

      it('should get advanced settings for the given relation', function (done) {
        const relations = [
          {
            id: 'some-uuid',
            domain: {
              id: 'investor',
              field: 'id'
            },
            range: {
              id: 'investment',
              field: 'investorid'
            },
            directLabel: 'by',
            joinType: 'INNER_JOIN'
          }
        ];
        init(relations);

        const relation1 = {};
        relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
        .then((rel) => {
          expect(rel.type).to.be('INNER_JOIN');
          done();
        })
        .catch(done);
      });

      it('should get advanced relation with the specified patterns', function (done) {
        const relations = [
          {
            id: 'some-uuid',
            domain: {
              id: 'weather-*',
              field: 'forecast'
            },
            range: {
              id: 'forecast',
              field: 'forecast'
            },
            directLabel: 'label',
            joinType: 'INNER_JOIN'
          }
        ];
        init(relations);

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

        relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
        .then((rel1) => {
          expect(rel1.type).to.be('INNER_JOIN');

          relationsHelper.addAdvancedJoinSettingsToRelation(relation2, 'some-uuid')
          .then((rel2) => {
            expect(rel2.type).to.be('INNER_JOIN');
            done();
          })
          .catch(done);

        })
        .catch(done);
      });


      describe('task_timeout', function () {
        describe('set to 0 in Advanced Setting -> kibi:joinTaskTimeout', function () {
          describe('should NOT set it if', function () {
            it('not present in relation', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by'
                }
              ];
              init(relations);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
              .then((rel1) => {
                expect(rel1.task_timeout).to.be(undefined);
                done();
              })
              .catch(done);
            });

            it('present and equal -1 in relation', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by',
                  timeout: -1
                }
              ];
              init(relations);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
              .then((rel1) => {
                expect(relation1.task_timeout).to.be(undefined);
                done();
              })
              .catch(done);
            });

            it('present and equal to 0 in relation', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by',
                  timeout: 0
                }
              ];
              init(relations);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
              .then((rel1) => {
                expect(relation1.task_timeout).to.be(undefined);
                done();
              })
              .catch(done);
            });
          });

          describe('should set it if ', function () {
            it('if it is set in the relation and is a valid positive integer', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by',
                  timeout: 123456
                }
              ];
              init(relations);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
              .then((rel1) => {
                expect(rel1.task_timeout).to.be(123456);
                done();
              })
              .catch(done);
            });
          });
        });

        describe('set to a valid positive integer in Advanced Setting -> kibi:joinTaskTimeout', function () {

          function stubConfig() {
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
          };

          afterEach(function () {
            config.get.restore();
          });

          describe('should NOT set it if ', function () {
            it('present and equal to 0 in relation', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by',
                  timeout: 0 // zero means disable
                }
              ];
              init(relations, stubConfig);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
              .then((rel1) => {
                expect(relation1.task_timeout).to.be(undefined);
                done();
              })
              .catch(done);
            });
          });

          describe('should set it if ', function () {

            it('not present in the relation', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by',
                }
              ];
              init(relations, stubConfig);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1, 'some-uuid')
              .then((rel1) => {
                expect(relation1.task_timeout).to.be(123);
                done();
              })
              .catch(done);
            });

            it('present in the relation and set to -1', function (done) {
              const relations = [
                {
                  id: 'some-uuid',
                  domain: {
                    id: 'investor',
                    field: 'id'
                  },
                  range: {
                    id: 'investment',
                    field: 'investorid'
                  },
                  directLabel: 'by',
                  timeout: -1
                }
              ];
              init(relations, stubConfig);

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

              relationsHelper.addAdvancedJoinSettingsToRelation(relation1)
              .then((rel1) => {
                expect(rel1.task_timeout).to.be(123);
                done();
              })
              .catch(done);
            });

          });
        });
      });

    });
  });
});
