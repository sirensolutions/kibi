define(function (require) {
  var _mark_filters_by_selected_entities;
  var globalState;
  var $rootScope;
  var fakeSavedQueries = require('fixtures/fake_saved_queries');


  describe('Kibi Components', function () {
    describe('Commons', function () {
      describe('_mark_filters_by_selected_entities', function () {

        beforeEach( function () {
          module('kibana');

          module('queries_editor/services/saved_queries', function ($provide) {
            $provide.service('savedQueries', fakeSavedQueries);
          });

          inject(function ($injector, Private, _globalState_, _$rootScope_) {
            $rootScope = _$rootScope_;
            globalState = _globalState_;
            _mark_filters_by_selected_entities = Private(require('plugins/kibi/commons/_mark_filters_by_selected_entities'));
          });
        });

        it('should mark dbfilter with query which depends on selected entity and selected entity NOT disabled', function (done) {
          var filters = [
            {
              dbfilter: {
                queryid: 'query1'
              },
              meta: {}
            }
          ];

          globalState.se = ['uri1'];
          globalState.entityDisabled = false;

          _mark_filters_by_selected_entities(filters).then(function (filters) {
            expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
            expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
            expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
            done();
          });

          $rootScope.$apply();
        });

        it('should mark disabled dbfilter with query which ' +
           'depends on selected document and selected document is NOT disabled', function (done) {
          var filters = [
            {
              dbfilter: {
                queryid: 'query1'
              },
              meta: {}
            }
          ];

          globalState.se = ['uri1'];
          globalState.entityDisabled = true;

          _mark_filters_by_selected_entities(filters).then(function (filters) {
            expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
            expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(true);
            expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
            done();
          });

          $rootScope.$apply();
        });

        it('should NOT mark dbfilter with query which does NOT depends on selected document', function (done) {
          var filters = [
            {
              dbfilter: {
                queryid: 'query2'
              },
              meta: {}
            }
          ];

          globalState.se = ['uri1'];
          globalState.entityDisabled = false;

          _mark_filters_by_selected_entities(filters).then(function (filters) {
            expect(filters[0].meta.dependsOnSelectedEntities).to.equal(false);
            expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
            expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
            done();
          });

          $rootScope.$apply();
        });

        it('query does not exists', function (done) {
          var filters = [
            {
              dbfilter: {
                queryid: 'does-not-exists'
              },
              meta: {}
            }
          ];

          globalState.se = ['uri1'];
          globalState.entityDisabled = false;

          _mark_filters_by_selected_entities(filters).catch(function (err) {
            expect(err.message).to.equal('Could not find query [does-not-exists]');
            done();
          });

          $rootScope.$apply();
        });

      });
    });
  });
});

