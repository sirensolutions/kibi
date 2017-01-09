describe('Kibi Controllers', function () {
  let $scope;
  const sinon = require('auto-release-sinon');
  const Promise = require('bluebird');
  const ngMock = require('ngMock');
  const expect = require('expect.js');

  function init(options) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardTitle', '');
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('apps/settings');

    ngMock.module('kibana/query_engine_client', function ($provide) {
      $provide.service('queryEngineClient', function () {
        return {
          clearCache: function () {
            return Promise.resolve();
          },
          getQueriesHtmlFromServer: function () {
            const resp = {
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

    ngMock.inject(function (kibiState, $rootScope, $controller) {
      sinon.stub(kibiState, 'getEntityURI').returns('entity1');
      $scope = $rootScope;
      $scope.vis = {
        params: options.params
      };
      $controller('KibiQueryViewerVisController', { $scope });
      $scope.$digest();
    });
  }

  describe('Kibi query viewer controller', function () {
    it('should not render templates if no query is set', function () {
      const params = {};

      init({ params: params });
      $scope.renderTemplates();
      expect($scope.holder.html).to.be('');
      expect($scope.holder.activeFetch).to.be(false);
    });

    it('should display no result', function (done) {
      const params = {
        queryDefinitions: [ 123 ]
      };

      init({ params: params });
      $scope.renderTemplates().then(function () {
        expect($scope.holder.html).to.be('No result');
        expect($scope.holder.activeFetch).to.be(false);
        done();
      }).catch(done);
    });

    it('should display the template', function (done) {
      const params = {
        queryDefinitions: [
          {
            queryId: 123
          }
        ]
      };
      const snippet = {
        html: 'grishka',
        data: {
          config: {
            id: 123
          }
        }
      };

      init({ params: params, snippet: snippet });
      $scope.renderTemplates().then(function () {
        expect($scope.holder.html).to.contain('grishka');
        expect($scope.holder.activeFetch).to.be(false);
        done();
      }).catch(done);
    });

    it('should warn that the query is not activated', function (done) {
      const params = {
        queryDefinitions: [
          {
            queryId: 123
          }
        ]
      };
      const snippet = {
        queryActivated: false
      };

      init({ params: params, snippet: snippet });
      $scope.renderTemplates().then(function () {
        expect($scope.holder.html).to.contain('No query template is triggered now. Select a document?');
        expect($scope.holder.activeFetch).to.be(false);
        done();
      }).catch(done);
    });
  });
});
