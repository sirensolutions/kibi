define(function (require) {

  var $ = require('jquery');
  var chrome = require('ui/chrome');
  var _ = require('lodash');

  require('ui/modules').get('kibana/query_engine_client')
  .service('queryEngineClient', function ($http) {

    function QueryEngineClient() {}

    QueryEngineClient.prototype._makeRequestToServer = function (url, queryDefs, options, async) {
      if (queryDefs && !(queryDefs instanceof Array) && (typeof queryDefs === 'object') && queryDefs !== null) {
        queryDefs = [queryDefs];
      }
      var params = {
        options: JSON.stringify(options),
        queryDefs: JSON.stringify(queryDefs)
      };

      if (async === false) {
        // here we use jquery to make a sync call as it is not supported in $http
        var p =  $.ajax({
          url: chrome.getBasePath() + url,
          async: false,
          dataType: 'json',
          data: params,
          dataFilter: function (data, type) {
            if (type === 'json') {
              var json = JSON.parse(data);
              // wrap it so the response is in the same form as returned from $http
              return JSON.stringify({
                data: json
              });
            } else {
              return data;
            }
          }
        });
        // here make an alias so we can use catch as with Promises
        p.catch = p.fail;
        return p;
      } else {
        return $http({
          method: 'GET',
          url: chrome.getBasePath() + url,
          params: params
        });
      }
    };

    QueryEngineClient.prototype.getQueriesDataFromServer = function (queryDefs, options, async) {
      return this._makeRequestToServer('/getQueriesData', queryDefs, options, async);
    };

    QueryEngineClient.prototype.getQueriesHtmlFromServer = function (queryDefs, options, async) {
      return this._makeRequestToServer('/getQueriesHtml', queryDefs, options, async);
    };

    QueryEngineClient.prototype.clearCache = function () {
      return $http({
        method: 'GET',
        url: '/clearCache'
      });
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
