define(function (require) {

  var chrome = require('ui/chrome');
  var _ = require('lodash');

  require('ui/modules').get('kibana/query_engine_client')
  .service('queryEngineClient', function ($http) {

    function QueryEngineClient() {}

    QueryEngineClient.prototype._makeRequestToServer = function (url, queryDefs, options) {
      options = options || {};
      options.selectedDocuments = _.compact(options.selectedDocuments);

      if (queryDefs && !(queryDefs instanceof Array) && (typeof queryDefs === 'object')) {
        queryDefs = [queryDefs];
      }

      queryDefs = _.filter(queryDefs, (queryDef) => !queryDef.isEntityDependent || options.selectedDocuments.length);

      if (!queryDefs.length) {
        return Promise.resolve({
          data: {
            error: 'Empty selected document uri'
          }
        });
      }

      var params = {
        options: JSON.stringify(options),
        queryDefs: JSON.stringify(queryDefs)
      };

      return $http.get(chrome.getBasePath() + url, { params: params });
    };

    QueryEngineClient.prototype.getQueriesDataFromServer = function (queryDefs, options) {
      return this._makeRequestToServer('/getQueriesData', queryDefs, options);
    };

    QueryEngineClient.prototype.getQueriesHtmlFromServer = function (queryDefs, options) {
      return this._makeRequestToServer('/getQueriesHtml', queryDefs, options);
    };

    QueryEngineClient.prototype.gremlin = function (datasourceId, options) {
      return $http.post(chrome.getBasePath() + '/gremlin', { params: { options, datasourceId } });
    };

    QueryEngineClient.prototype.gremlinPing = function (url) {
      return $http.post(chrome.getBasePath() + '/gremlin/ping', { url: url });
    };

    QueryEngineClient.prototype.clearCache = function () {
      return $http.get(chrome.getBasePath() + '/clearCache');
    };

    return new QueryEngineClient();
  });
});
