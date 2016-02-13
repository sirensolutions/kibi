var doesVisDependsOnSelectedEntities;
var globalState;
var $rootScope;
var fakeSavedQueries = require('../../../../../../fixtures/kibi/fake_saved_queries');
var ngMock = require('ngMock');
var expect = require('expect.js');


describe('Kibi Components', function () {
  describe('Commons', function () {
    describe('_does_vis_depends_on_selected_entities', function () {

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', fakeSavedQueries);
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
            queryIds: [
              {queryId: 'query1'} // this query depends on selected entity
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(true);
          done();
        });

        $rootScope.$apply();
      });


      it('vis kibi-data-table - query does not depends on selected entity', function (done) {
        var vis = {
          type: {
            name: 'kibi-data-table'
          },
          params: {
            queryIds: [
              {queryId: 'query2'}
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        });

        $rootScope.$apply();
      });


      it('vis kibi-data-table - query does not exists', function (done) {
        var vis = {
          type: {
            name: 'kibi-data-table'
          },
          params: {
            queryIds: [
              {queryId: 'query-does-not-exists'}
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).catch(function (err) {
          expect(err.message).to.equal('Could not find query [query-does-not-exists]');
          done();
        });

        $rootScope.$apply();
      });

      it('vis sindicetechentityinfo', function (done) {
        var vis = {
          type: {
            name: 'sindicetechentityinfo'
          },
          params: {
            queryOptions: [
              {queryId: 'query1'} // this query depends on selected entity
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(true);
          done();
        });

        $rootScope.$apply();
      });

      it('vis sindicetechentityinfo - query does not depend on selected entity', function (done) {
        var vis = {
          type: {
            name: 'sindicetechentityinfo'
          },
          params: {
            queryOptions: [
              {queryId: 'query2'} // this query does NOT depends on selected entity
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        });

        $rootScope.$apply();
      });

      it('vis sindicetechentityinfo - query does not exists', function (done) {
        var vis = {
          type: {
            name: 'sindicetechentityinfo'
          },
          params: {
            queryOptions: [
              {queryId: 'query-does-not-exists'}
            ]
          }
        };

        doesVisDependsOnSelectedEntities(vis).catch(function (err) {
          expect(err.message).to.equal('Could not find query [query-does-not-exists]');
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
                queryIds: [{id: 'query1'}]
              }
            }
          ]

        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(true);
          done();
        });

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
                queryIds: [{id: 'query2'}]
              }
            }
          ]

        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        });

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
                queryIds: [{id: 'query-does-not-exists'}]
              }
            }
          ]

        };

        doesVisDependsOnSelectedEntities(vis).catch(function (err) {
          expect(err.message).to.equal('Could not find query [query-does-not-exists]');
          done();
        });

        $rootScope.$apply();
      });


      it('vis pie - aggs do not contain queryIds', function (done) {
        var vis = {
          type: {
            name: 'pie'
          },
          aggs:[
            {
              params: {
              }
            }
          ]
        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        });

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
                queryIds: [{id: 'query2'}]
              }
            }
          ]

        };

        doesVisDependsOnSelectedEntities(vis).then(function (res) {
          expect(res).to.equal(false);
          done();
        });

        $rootScope.$apply();
      });

    });
  });
});
