var doesVisDependsOnSelectedEntities;
var globalState;
var $rootScope;

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
          $provide.service('savedQueries', (Promise) => mockSavedObjects(Promise)('savedQueries', fakeSavedQueries));
        });

        ngMock.inject(function ($injector, Private, _globalState_, _$rootScope_) {
          $rootScope = _$rootScope_;
          globalState = _globalState_;
          doesVisDependsOnSelectedEntities = Private(require('ui/kibi/components/commons/_does_vis_depends_on_selected_entities'));
        });
      });


      it('vis kibi-data-table', function (done) {
        var vis = {
          type: {
            name: 'kibi-data-table'
          },
          params: {
            queryDefinitions: [
              {queryId: 'query1'} // this query depends on selected entity
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(true);
          done();
        }).catch(done);

        $rootScope.$apply();
      });


      it('vis kibi-data-table - query does not depends on selected entity', function (done) {
        var vis = {
          type: {
            name: 'kibi-data-table'
          },
          params: {
            queryDefinitions: [
              {queryId: 'query2'}
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        }).catch(done);

        $rootScope.$apply();
      });


      it('vis kibi-data-table - query does not exists', function (done) {
        var vis = {
          type: {
            name: 'kibi-data-table'
          },
          params: {
            queryDefinitions: [
              {queryId: 'query-does-not-exists'}
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function () {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.equal('Unable to find queries: ["query-does-not-exists"]');
          done();
        });

        $rootScope.$apply();
      });

      it('vis sindicetechentityinfo', function (done) {
        var vis = {
          type: {
            name: 'kibiqueryviewervis'
          },
          params: {
            queryDefinitions: [
              {queryId: 'query1'} // this query depends on selected entity
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(true);
          done();
        }).catch(done);

        $rootScope.$apply();
      });

      it('vis sindicetechentityinfo - query does not depend on selected entity', function (done) {
        var vis = {
          type: {
            name: 'kibiqueryviewervis'
          },
          params: {
            queryDefinitions: [
              {queryId: 'query2'} // this query does NOT depends on selected entity
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        }).catch(done);

        $rootScope.$apply();
      });

      it('vis sindicetechentityinfo - query does not exists', function (done) {
        var vis = {
          type: {
            name: 'kibiqueryviewervis'
          },
          params: {
            queryDefinitions: [
              {queryId: 'query-does-not-exists'}
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function () {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.equal('Unable to find queries: ["query-does-not-exists"]');
          done();
        });

        $rootScope.$apply();
      });

      it('vis pie', function (done) {
        var vis = {
          type: {
            name: 'pie'
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

        $rootScope.$apply();
      });

      it('vis pie - query does not depends on selected entity', function (done) {
        var vis = {
          type: {
            name: 'pie'
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

        $rootScope.$apply();
      });

      it('vis pie - query does not exists', function (done) {
        var vis = {
          type: {
            name: 'pie'
          },
          aggs:[
            {
              params: {
                queryDefinitions: [
                  {
                    queryId: 'query-does-not-exists'
                  }
                ]
              }
            }
          ]

        };

        doesVisDependsOnSelectedEntities(vis).then(function () {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.equal('Unable to find queries: ["query-does-not-exists"]');
          done();
        });

        $rootScope.$apply();
      });


      it('vis pie - aggs do not contain queryDefinitions', function (done) {
        var vis = {
          type: {
            name: 'pie'
          },
          aggs:[
            {
              params: {}
            }
          ]
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        }).catch(done);

        $rootScope.$apply();
      });


      it('unknown vis', function (done) {
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

        $rootScope.$apply();
      });

    });
  });
});
