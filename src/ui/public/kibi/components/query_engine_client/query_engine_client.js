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

    QueryEngineClient.prototype.clearCache = function () {
      return $http.get(chrome.getBasePath() + '/clearCache');
    };

    QueryEngineClient.prototype.proxy = function (datasourceId, options) {
      if (!options.path) {
        options.path = '/';
      }
      if (options.path.substr(0, 1) !== '/') {
        options.path = '/' + options.path;
      }
      var proxyOptions = {
        method: options.method | 'GET',
        url: chrome.getBasePath() + '/datasource/' + datasourceId + '/proxy' + options.path
      };
      _.assign(proxyOptions, options);
      return $http(proxyOptions);
    };
    return new QueryEngineClient();
  });
});
