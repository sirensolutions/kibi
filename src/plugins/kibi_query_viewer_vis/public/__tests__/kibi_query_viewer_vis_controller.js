describe('Kibi Controllers', function () {
  var $scope;
  var sinon = require('auto-release-sinon');
  var Promise = require('bluebird');
  var ngMock = require('ngMock');
  var expect = require('expect.js');

  function init({ snippet, snippetError, params = {} } = {}) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
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
                snippets: snippet ? [ snippet ] : [],
                error: snippetError
              }
            };
            return Promise.resolve(resp);
          }
        };
      });
    });

    ngMock.inject(function (kibiState, $rootScope, $controller) {
      sinon.stub(kibiState, 'getEntityURI').returns({ index: 'a', type: 'b', id: 'c' });
      $scope = $rootScope;
      $scope.vis = { params };
      $controller('KibiQueryViewerVisController', { $scope });
      $scope.$digest();
    });
  }

  describe('Kibi query viewer controller', function () {
    it('should not render templates if no query is set', function () {
      init();
      $scope.renderTemplates();
      expect($scope.holder.html).to.be('');
      expect($scope.holder.activeFetch).to.be(false);
    });

    it('should display no result', function () {
      const params = {
        queryDefinitions: [ 123 ]
      };

      init({ params });
      return $scope.renderTemplates().then(function () {
        expect($scope.holder.html).to.be('No result');
        expect($scope.holder.activeFetch).to.be(false);
      });
    });

    it('should display the template', function () {
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

      init({ params, snippet });
      return $scope.renderTemplates().then(function () {
        expect($scope.holder.html).to.contain('grishka');
        expect($scope.holder.activeFetch).to.be(false);
      });
    });

    it('should warn that the query is not activated', function () {
      const params = {
        queryDefinitions: [
          {
            queryId: 123
          }
        ]
      };
      const snippet = {
        queryActivated: false,
        html: 'No query template is triggered now. Select a document?'
      };

      init({ params, snippet });
      return $scope.renderTemplates().then(function () {
        expect($scope.holder.html).to.contain('No query template is triggered now. Select a document?');
        expect($scope.holder.activeFetch).to.be(false);
      });
    });
  });
});
