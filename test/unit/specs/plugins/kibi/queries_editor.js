define(function (require) {
  describe('Kibi Controllers', function () {
    var $scope;
    var jQuery = require('jquery');
    var sinon = require('test_utils/auto_release_sinon');
    var Promise = require('bluebird');
    var globalState;

    function init(options) {
      module('apps/settings');

      module('kibana', function ($provide) {
        $provide.service('savedDatasources', require('fixtures/fake_saved_datasources'));
      });

      module('app/visualize', function ($provide) {
        $provide.service('savedVisualizations', function () {
          return {
            find: function () {
              return Promise.resolve({ hits: options.hits });
            }
          };
        });
      });

      module('kibana/query_engine_client', function ($provide) {
        $provide.service('queryEngineClient', function () {
          return {
            clearCache: function () {
              return Promise.resolve();
            },
            getQueriesHtmlFromServer: function () {
              var resp = {
                data: {
                  snippets: options.snippet ? [ options.snippet ] : [],
                  error: options.snippetError
                }
              };
              return Promise.resolve(resp);
            }
          };
        });
      });

      inject(function ($rootScope, $controller, _globalState_) {
        var fakeRoute = {
          current: {
            locals: {}
          }
        };
        fakeRoute.current.locals.query = options.query;

        globalState = _globalState_;
        $scope = $rootScope;
        $scope.datasourceType = options.datasourceType;
        $controller('QueriesEditor', {
          $scope: $scope,
          $route: fakeRoute,
          $element: jQuery('<div><form name="objectForm" class="ng-valid"></div>')
        });
        $scope.$digest();
      });
    }

    describe('queries editor', function () {
      it('should set kibi-table-jade as the default template if not set', function () {
        var query = {
          title: 'ahah'
        };
        init({ query: query });
        expect(query._previewTemplateId).to.be('kibi-table-jade');
      });

      it('should enable the entity URI', function () {
        var query = {
          title: 'ahah',
          _previewTemplateId: 'mytmpl',
          st_activationQuery: '@doc[id]@'
        };
        init({ query: query });
        expect(query._previewTemplateId).to.be('mytmpl');
        expect($scope.holder.entityURIEnabled).to.be(true);
      });

      it('should detect the star', function () {
        var query = {
          title: 'ahah',
          _previewTemplateId: 'mytmpl',
          st_activationQuery: 'select * { ?s :name ?o }'
        };
        init({ query: query });
        expect(query._previewTemplateId).to.be('mytmpl');
        expect($scope.holder.entityURIEnabled).to.be(false);
        expect($scope.starDetectedInAQuery).to.be(true);
      });

      it('should submit the query', function (done) {
        var query = {
          title: '123',
          save: sinon.stub().returns(Promise.resolve('queryid'))
        };
        var snippet = {
          john: 'connor',
          html: 'are you there'
        };

        init({ query: query, snippet: snippet });

        expect($scope.holder.htmlPreview).not.to.be.ok();
        expect($scope.holder.jsonPreview).not.to.be.ok();
        $scope.submit().then(function () {
          expect($scope.holder.htmlPreview).to.be('are you there');
          expect($scope.holder.jsonPreview).to.be.ok();
          done();
        });
      });

      it('should display an error on submit if the query is not correct', function (done) {
        var query = {
          title: '123',
          save: sinon.stub().returns(Promise.resolve('queryid'))
        };

        init({ query: query, snippetError:'error with the query' });

        expect($scope.holder.htmlPreview).not.to.be.ok();
        expect($scope.holder.jsonPreview).not.to.be.ok();
        $scope.submit().then(function () {
          expect($scope.holder.jsonPreview).to.be.ok();
          expect($scope.holder.htmlPreview).to.match(/Error/);
          done();
        });
      });

      it('should delete the query 123', function (done) {
        var query = {
          id: '123',
          delete: sinon.stub().returns(Promise.resolve({}))
        };
        var hits = [
          {
            title: 'john',
            visState: '{"params":{"queryIds":[{"id":"","queryId":"another one","queryVariableName":"competitor"}]}}',
            description: '',
            savedSearchId: 'Articles',
            version: 1,
            kibanaSavedObjectMeta: {
              searchSourceJSON: '{"filter":[]}'
            }
          }
        ];
        var snippet = {
          john: 'connor',
          html: 'are you there'
        };

        sinon.stub(window, 'confirm').returns(true);

        init({ query: query, snippet: snippet, hits: hits });

        $scope.delete().then(function () {
          expect(query.delete.callCount).to.be(1);
          done();
        });
      });

      it('should delete the query even if the query id is in the visualisation title', function (done) {
        var query = {
          id: '123',
          delete: sinon.stub().returns(Promise.resolve({}))
        };
        var hits = [
          {
            title: 'got you 123',
            visState: '{"params":{"queryIds":[{"id":"","queryId":"another one","queryVariableName":"competitor"}]}}',
            description: '',
            savedSearchId: 'Articles',
            version: 1,
            kibanaSavedObjectMeta: {
              searchSourceJSON: '{"filter":[]}'
            }
          }
        ];
        var snippet = {
          john: 'connor',
          html: 'are you there'
        };

        sinon.stub(window, 'confirm').returns(true);

        init({ query: query, snippet: snippet, hits: hits });

        $scope.delete().then(function () {
          expect(query.delete.callCount).to.be(1);
          done();
        });
      });

      it('should not delete the query if some visualisations still depend on it', function (done) {
        var query = {
          title: 'iron',
          id: '123'
        };
        var hits = [
          {
            title: 'myvis',
            visState: '{"params":{"queryIds":[{"id":"","queryId":"123","queryVariableName":"competitor"}]}}',
            description: '',
            savedSearchId: 'Articles',
            version: 1,
            kibanaSavedObjectMeta: {
              searchSourceJSON: '{"filter":[]}'
            }
          }
        ];
        var snippet = {
          john: 'connor',
          html: 'are you there'
        };
        var stub = sinon.stub(window, 'alert', function () { return false; });

        init({ query: query, snippet: snippet, hits: hits });

        $scope.delete().then(function () {
          expect(stub.callCount).to.be(1);
          expect(stub.getCall(0).args[0]).to.match(/myvis/);
          done();
        });
      });

      it('should grab the selected document', function () {
        var query = {
          id: '123'
        };
        init({ query: query });

        globalState.se = [ 'grishka' ];
        $scope.$emit('kibi:selectedEntities:changed', '');
      });

      it('should update the REST datasource', function () {
        var query = {};
        init({ query: query, datasourceType: '123' });

        var stub = sinon.spy($scope, 'preview');
        expect($scope.datasourceType).to.be('123');
        query.st_datasourceId = 'ds3';
        $scope.$digest();
        expect($scope.datasourceType).to.be('rest');
        expect(query._previewTemplateId).to.be('kibi-json-jade');
        expect(stub.called).to.be(true);
      });

      it('should update the datasource type along with the datasource ID', function () {
        var query = {};
        init({ query: query, datasourceType: '123' });

        var stub = sinon.spy($scope, 'preview');
        expect($scope.datasourceType).to.be('123');
        query.st_datasourceId = 'ds1';
        $scope.$digest();
        expect($scope.datasourceType).to.be('sparql_http');
        expect(query._previewTemplateId).to.be('kibi-table-jade');
        expect(stub.called).to.be(true);
      });
    });
  });
});
