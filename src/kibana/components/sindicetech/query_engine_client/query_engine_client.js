define(function (require) {

  var _ = require('lodash');
  var $ = require('jquery');
  require('services/es');
  require('services/promises');

  require('modules').get('kibana/query_engine_client')
  .service('queryEngineClient', function (Promise, Private, Notifier, $http) {

    function QueryEngineClient() {}

    QueryEngineClient.prototype._makeRequestToServer = function (url, params, async) {
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
        // here we return the Promise the usual way
        return $http({
          method: 'GET',
          url: url,
          params: params
        });
      }
    };


    QueryEngineClient.prototype.getQueriesDataFromServer = function (uri, folderName, datasourceId, queryDefs, async) {
      if (queryDefs && !(queryDefs instanceof Array) && (typeof queryDefs === 'object') && queryDefs !== null) {
        queryDefs = [queryDefs];
      }
      var params = {
        entityURI:    uri,
        datasourceId: datasourceId,
        folderName:   folderName,
        queryDefs:    JSON.stringify(queryDefs),
      };
      return this._makeRequestToServer('datasource/getQueriesData', params, async);
    };


    QueryEngineClient.prototype.getQueriesHtmlFromServer = function (uri, folderName, datasourceId, queryDefs, async, queryOptions) {
      if (queryDefs && !(queryDefs instanceof Array) && (typeof queryDefs === 'object') && queryDefs !== null) {
        queryDefs = [queryDefs];
      }
      var params = {
        entityURI: uri,
        datasourceId: datasourceId,
        folderName:   folderName,
        queryDefs:     JSON.stringify(queryDefs),
        queryOptions: JSON.stringify(queryOptions)
      };
      return this._makeRequestToServer('datasource/getQueriesHtml', params, async);
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
