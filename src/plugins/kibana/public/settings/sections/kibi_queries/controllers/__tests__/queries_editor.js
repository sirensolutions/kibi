var expect = require('expect.js');
var sinon = require('auto-release-sinon');
var ngMock = require('ngMock');
var jQuery = require('jquery');
var Promise = require('bluebird');
var noDigestPromises = require('testUtils/noDigestPromises');
var globalState;
var $scope;

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var fakeSavedDatasources = [
  {
    id: 'ds1',
    title: 'ds1 datasource',
    datasourceType: 'sparql_http'
  },
  {
    id: 'ds2',
    title: 'ds2 datasource',
    datasourceType: 'mysql'
  },
  {
    id: 'ds3',
    title: 'ds3 datasource',
    datasourceType: 'rest'
  }
];

describe('Kibi Controllers', function () {

  function init(options) {
    ngMock.module('kibana');

    ngMock.module('kibi_datasources/services/saved_datasources', function ($provide) {
      $provide.service('savedDatasources', (Promise) => mockSavedObjects(Promise)('savedDatasources', fakeSavedDatasources));
    });

    ngMock.module('app/visualize', function ($provide) {
      $provide.service('savedVisualizations', (Promise) => mockSavedObjects(Promise)('savedVisualizations', options.hits));
    });

    ngMock.module('kibana/query_engine_client', function ($provide) {
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

    ngMock.inject(function ($rootScope, $controller, _globalState_) {
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

    noDigestPromises.activateForSuite();

    it('should set kibi-table-jade as the default template if not set', function () {
      var query = {
        title: 'ahah'
      };
      init({ query: query });
      expect(query._previewTemplateId).to.be('kibi-table-jade');
    });

    it('should enable the entity URI', function () {
      var query = {
        id: '1ahah', // starts with 1 to indicate it is dependent on an entity
        title: 'ahah',
        _previewTemplateId: 'mytmpl',
        activationQuery: '@doc[id]@'
      };
      init({ query: query });
      expect(query._previewTemplateId).to.be('mytmpl');
      expect($scope.holder.entityURIEnabled).to.be(true);
    });

    it('should detect the star', function () {
      var query = {
        title: 'ahah',
        _previewTemplateId: 'mytmpl',
        activationQuery: 'select * { ?s :name ?o }'
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


    it('should grab the selected document', function () {
      var query = {
        id: '123'
      };
      init({ query: query });

      globalState.se = [ 'grishka' ];
      $scope.$emit('kibi:selectedEntities:changed', '');
    });

    it('should update the REST datasource', function () {
      noDigestPromises.deactivate();
      var query = {};
      init({ query: query, datasourceType: '123' });

      var stub = sinon.spy($scope, 'preview');
      expect($scope.datasourceType).to.be('123');
      query.datasourceId = 'ds3';
      $scope.$digest();
      expect($scope.datasourceType).to.be('rest');
      expect(query._previewTemplateId).to.be('kibi-json-jade');
      expect(stub.called).to.be(true);
    });

    it('should update the datasource type along with the datasource ID', function () {
      noDigestPromises.deactivate();
      var query = {};
      init({ query: query, datasourceType: '123' });

      var stub = sinon.spy($scope, 'preview');
      expect($scope.datasourceType).to.be('123');
      query.datasourceId = 'ds1';
      $scope.$digest();
      expect($scope.datasourceType).to.be('sparql_http');
      expect(query._previewTemplateId).to.be('kibi-table-jade');
      expect(stub.called).to.be(true);
    });
  });
});
