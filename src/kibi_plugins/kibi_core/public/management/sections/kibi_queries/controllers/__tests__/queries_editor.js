import * as onPage from 'ui/kibi/utils/on_page';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import jQuery from 'jquery';
import Promise from 'bluebird';
import noDigestPromises from 'test_utils/no_digest_promises';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';

let kibiState;
let $scope;

const savedDatasources = [
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

  function init({ hits, snippet, snippetError, query, datasourceType }) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardTitle', '');
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('kibi_datasources/services/saved_datasources', function ($provide) {
      $provide.service('savedDatasources', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDatasources', savedDatasources));
    });

    ngMock.module('app/visualize', function ($provide) {
      $provide.service('savedVisualizations', (Promise, Private) => mockSavedObjects(Promise, Private)('savedVisualizations', hits));
    });

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

    ngMock.inject(function ($rootScope, $controller, _kibiState_) {
      sinon.stub(onPage, 'onManagementPage').returns(true);

      kibiState = _kibiState_;
      sinon.stub(kibiState, 'getEntityURI').returns('entity1');

      $scope = $rootScope;
      $scope.datasourceType = datasourceType;
      $controller('QueriesEditor', {
        $scope: $scope,
        $route: {
          current: {
            locals: {
              query: query
            }
          }
        },
        $element: jQuery('<div><form name="objectForm" class="ng-valid"></div>')
      });
      $scope.$digest();
    });
  }

  describe('queries editor', function () {

    noDigestPromises.activateForSuite();

    it('should enable the entity URI', function () {
      const query = {
        id: 'ahah',
        title: 'ahah',
        activationQuery: '@doc[id]@'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(true);
    });

    it('should detect the star', function () {
      const query = {
        title: 'ahah',
        activationQuery: 'select * { ?s :name ?o }'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(false);
      expect($scope.starDetectedInAQuery).to.be(true);
    });

    it('should not detect the subselect star for SPARQL', function () {
      const query = {
        title: 'ahah',
        activationQuery: 'SELECT ?id { { SELECT * { ?s :name ?o } }}'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(false);
      expect($scope.starDetectedInAQuery).to.be(false);
    });

    it('should detect the star for SQL query', function () {
      const query = {
        title: 'ahah',
        activationQuery: 'select * from company limit 10'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(false);
      expect($scope.starDetectedInAQuery).to.be(true);
    });

    it('should not detect the subselect star for SQL', function () {
      const query = {
        title: 'ahah',
        activationQuery: 'select id from ( select * from company limit 100 ) limit 10'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(false);
      expect($scope.starDetectedInAQuery).to.be(false);
    });

    it('should detect comment lines for activationQuery', function () {
      const query = {
        title: 'commented lines',
        activationQuery: 'select * \n' +
                         'from test \n' +
                         '/* where name \n' + '= \'@doc[_source][github_id]@\' */'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(false);
    });

    it('should detect comment lines for resultQuery', function () {
      const query = {
        title: 'commented lines',
        resultQuery: 'select * \n' +
                     'from test \n' +
                     '/* where name \n' + '= \'@doc[_source][github_id]@\' */'
      };
      init({ query: query });
      expect($scope.holder.entityURIEnabled).to.be(false);
    });

    it('should submit the query', function (done) {
      const query = {
        title: '123',
        save: sinon.stub().returns(Promise.resolve('queryid'))
      };
      const snippet = {
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
      }).catch(done);
    });

    it('should display an error on submit if the query is not correct', function (done) {
      const query = {
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
      }).catch(done);
    });

    it('should update the REST datasource', function () {
      noDigestPromises.deactivate();
      const query = {};
      init({ query: query, datasourceType: '123' });

      const stub = sinon.spy($scope, 'preview');
      expect($scope.datasourceType).to.be('123');
      query.datasourceId = 'ds3';
      $scope.$digest();
      expect($scope.datasourceType).to.be('rest');
      expect($scope.preview.templateId).to.be('kibi-json-jade');
      expect(stub.called).to.be(true);
    });

    it('should update the datasource type along with the datasource ID', function () {
      noDigestPromises.deactivate();
      const query = {};
      init({ query: query, datasourceType: '123' });

      const stub = sinon.spy($scope, 'preview');
      expect($scope.datasourceType).to.be('123');
      query.datasourceId = 'ds1';
      $scope.$digest();
      expect($scope.datasourceType).to.be('sparql_http');
      expect($scope.preview.templateId).to.be('kibi-table-jade');
      expect(stub.called).to.be(true);
    });
  });
});
