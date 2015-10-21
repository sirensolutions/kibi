define(function (require) {
  var _does_vis_depends_on_selected_entities;
  var globalState;
  var $rootScope;
  var fakeSavedQueries = require('fixtures/fake_saved_queries');


  describe('Kibi Components', function () {
    describe('Commons', function () {
      describe('_does_vis_depends_on_selected_entities', function () {

        beforeEach( function () {
          module('kibana');

          module('queries_editor/services/saved_queries', function ($provide) {
            $provide.service('savedQueries', fakeSavedQueries);
          });

          inject(function ($injector, Private, _globalState_, _$rootScope_) {
            $rootScope = _$rootScope_;
            globalState = _globalState_;
            _does_vis_depends_on_selected_entities = Private(require('plugins/kibi/commons/_does_vis_depends_on_selected_entities'));
          });
        });


        it('vis sindicetechtable', function (done) {
          var vis = {
            type: {
              name: 'sindicetechtable'
            },
            params: {
              queryIds: [
                {queryId: 'query1'} // this query depends on selected entity
              ]
            }
          };

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
            expect(res).to.equal(true);
            done();
          });

          $rootScope.$apply();
        });


        it('vis sindicetechtable - query does not depends on selected entity', function (done) {
          var vis = {
            type: {
              name: 'sindicetechtable'
            },
            params: {
              queryIds: [
                {queryId: 'query2'}
              ]
            }
          };

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
            expect(res).to.equal(false);
            done();
          });

          $rootScope.$apply();
        });


        it('vis sindicetechtable - query does not exists', function (done) {
          var vis = {
            type: {
              name: 'sindicetechtable'
            },
            params: {
              queryIds: [
                {queryId: 'query-does-not-exists'}
              ]
            }
          };

          _does_vis_depends_on_selected_entities(vis).catch(function (err) {
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

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
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

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
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

          _does_vis_depends_on_selected_entities(vis).catch(function (err) {
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

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
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

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
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

          _does_vis_depends_on_selected_entities(vis).catch(function (err) {
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

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
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

          _does_vis_depends_on_selected_entities(vis).then(function (res) {
            expect(res).to.equal(false);
            done();
          });

          $rootScope.$apply();
        });

      });
    });
  });
});
