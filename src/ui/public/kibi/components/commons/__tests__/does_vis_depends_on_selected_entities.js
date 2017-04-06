var doesVisDependsOnSelectedEntities;

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var fakeSavedQueries = [
  {
    id: 'query1',
    title: '',
    resultQuery: 'SELECT * FROM mytable WHERE id = \'@doc[_source][id]@\''
  },
  {
    id: 'query2',
    title: '',
    resultQuery: 'SELECT * FROM mytable WHERE id = \'123\''
  }
];
var ngMock = require('ngMock');
var expect = require('expect.js');

describe('Kibi Components', function () {
  describe('Commons', function () {
    describe('_does_vis_depends_on_selected_entities', function () {

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', fakeSavedQueries));
        });

        ngMock.inject(function (Private) {
          doesVisDependsOnSelectedEntities = Private(require('ui/kibi/components/commons/_does_vis_depends_on_selected_entities'));
        });
      });

      require('testUtils/noDigestPromises').activateForSuite();

      [
        'kibiqueryviewervis',
        'kibi-data-table'
      ].forEach(function (visName) {
        describe(`vis ${visName}`, function () {
          it('should depend on the entity', function (done) {
            var vis = {
              type: {
                name: visName
              },
              params: {
                queryDefinitions: [
                  {queryId: 'query1'} // this query depends on selected entity
                ]
              }
            };

            if (visName === 'kibi-data-table') {
              vis.params.enableQueryFields = true;
            }
            doesVisDependsOnSelectedEntities(vis).then(function (res) {
              expect(res).to.equal(true);
              done();
            }).catch(done);
          });

          it('should not depend on the entity', function (done) {
            var vis = {
              type: {
                name: visName
              },
              params: {
                queryDefinitions: [
                  {queryId: 'query2'}
                ]
              }
            };

            if (visName === 'kibi-data-table') {
              vis.params.enableQueryFields = true;
            }
            doesVisDependsOnSelectedEntities(vis).then(function (res) {
              expect(res).to.equal(false);
              done();
            }).catch(done);
          });

          it('should fail if the query does not exist', function (done) {
            var vis = {
              type: {
                name: visName
              },
              params: {
                queryDefinitions: [
                  { queryId: 'query-does-not-exist' }
                ]
              }
            };

            if (visName === 'kibi-data-table') {
              vis.params.enableQueryFields = true;
            }
            doesVisDependsOnSelectedEntities(vis).then(function () {
              done('should fail');
            }).catch(function (err) {
              expect(err.message).to.equal('Unable to find queries: ["query-does-not-exist"]');
              done();
            });
          });
        });
      });

      [
        'pie',
        'table',
        'line',
        'area',
        'histogram'
      ].forEach(function (visName) {
        describe(`vis ${visName}`, function () {
          it('should depend on the entity', function (done) {
            var vis = {
              type: {
                name: visName
              },
              aggs:[
                {
                  params: {
                    queryDefinitions: [
                      {
                        queryId: 'query1'
                      }
                    ]
                  }
                }
              ]
            };

            doesVisDependsOnSelectedEntities(vis).then(function (res) {
              expect(res).to.equal(true);
              done();
            }).catch(done);
          });

          it('should not depend on the entity', function (done) {
            var vis = {
              type: {
                name: visName
              },
              aggs:[
                {
                  params: {
                    queryDefinitions: [
                      {
                        queryId: 'query2'
                      }
                    ]
                  }
                }
              ]
            };

            doesVisDependsOnSelectedEntities(vis).then(function (res) {
              expect(res).to.equal(false);
              done();
            }).catch(done);
          });

          it('should fail if the query does not exist', function (done) {
            var vis = {
              type: {
                name: visName
              },
              aggs:[
                {
                  params: {
                    queryDefinitions: [
                      {
                        queryId: 'query-does-not-exist'
                      }
                    ]
                  }
                }
              ]
            };

            doesVisDependsOnSelectedEntities(vis).then(function () {
              done('should fail');
            }).catch(function (err) {
              expect(err.message).to.equal('Unable to find queries: ["query-does-not-exist"]');
              done();
            });
          });
        });
      });

      it('should not depend on entity for some unknown vis', function (done) {
        var vis = {
          type: {
            name: 'extra-pie'
          },
          aggs:[
            {
              params: {
                queryDefinitions: [
                  {
                    queryId: 'query2'
                  }
                ]
              }
            }
          ]

        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        }).catch(done);
      });

    });
  });
});
