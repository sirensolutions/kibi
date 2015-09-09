define(function (require) {

  var $ = require('jquery');

  require('modules').get('kibana/query_engine_client')
  .service('queryEngineClient', function ($http) {

    function QueryEngineClient() {}

    QueryEngineClient.prototype._makeRequestToServer = function (url, uri, queryDefs, async) {
      if (queryDefs && !(queryDefs instanceof Array) && (typeof queryDefs === 'object') && queryDefs !== null) {
        queryDefs = [queryDefs];
      }
      var params = {
        entityURI: uri,
        queryDefs: JSON.stringify(queryDefs)
      };

      if (async === false) {
        // here we use jquery to make a sync call as it is not supported in $http
        var p =  $.ajax({
          url: url,
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
          url: url,
          params: params
        });
      }
    };

    QueryEngineClient.prototype.getQueriesDataFromServer = function (uri, queryDefs, async) {
      return this._makeRequestToServer('datasource/getQueriesData', uri, queryDefs, async);
    };

    QueryEngineClient.prototype.getQueriesHtmlFromServer = function (uri, queryDefs, async) {
      return this._makeRequestToServer('datasource/getQueriesHtml', uri, queryDefs, async);
    };

    QueryEngineClient.prototype.clearCache = function () {
      return $http({
        method: 'GET',
        url: 'datasource/clearCache'
      });
    };

    return new QueryEngineClient();
  });
});
