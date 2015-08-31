var _       = require('lodash');
var Promise = require('bluebird');
var rp      = require('request-promise');
var url     = require('url');
var http    = require('http');
var config  = require('../../config');
var AbstractQuery = require('./abstractQuery');


function SparqlQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
}

SparqlQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': SparqlQuery
});

SparqlQuery.prototype._getQueryFromConfig = function (query, uri) {
  // remove extra white spaces
  // and replace the @URI@ placeholder
  return this.config.prefixesString + ' ' + query.replace(/\s{2,}/g, ' ').replace(/@URI@/g, uri);
};

// return a promise which when resolved should return
// a following response object
// {
//    "boolean": true/false
// }
SparqlQuery.prototype.checkIfItIsRelevant = function (uri) {
  if (this.requireEntityURI && (!uri || uri === '')) {
    return Promise.reject('Got empty uri while it is required by sparql activation query');
  }

  var datasource = config.kibana.datasources[this.config.datasourceId];
  var query = this._getQueryFromConfig(this.config.activationQuery, uri);

  if (query.trim() === '') {
    return Promise.resolve({'boolean': true});
  }

  var self = this;

  var cache_key = this.generateCacheKey(datasource.uri, query);

  if (self.cache) {
    var v = self.cache.get(cache_key);
    if (v) {
      return Promise.resolve(v);
    }
  }

  return rp({
    method: 'GET',
    uri: url.parse(datasource.uri),
    qs: {
      format: 'application/sparql-results+json',
      query: query
    },
    timeout: datasource.timeout || 1000,
    transform: function (resp) {
      var data = JSON.parse(resp);
      if (self.cache) {
        self.cache.set(cache_key, data, datasource.maxAge);
      }
      return data;
    }
  });
};


SparqlQuery.prototype._extractIds = function (data, idVariableName) {
  var ids = [];
  if (data && data.results && data.results.bindings) {
    for (var i = 0; i < data.results.bindings.length; i++) {
      if (data.results.bindings[i][idVariableName]) {
        ids.push(data.results.bindings[i][idVariableName].value);
      }
    }
  }
  return ids;
};


SparqlQuery.prototype.fetchResults = function (uri, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;

  var datasource = config.kibana.datasources[this.config.datasourceId];
  var query = this._getQueryFromConfig(this.config.resultQuery, uri);

  // special case - we can not simply reject the Promise
  // bacause this will cause the whole group of promissses to be rejected
  if (this.resultQueryRequireEntityURI && (!uri || uri === '')) {
    return this._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }

  var cache_key = this.generateCacheKey(datasource.uri, query, onlyIds, idVariableName);

  if (self.cache) {
    var v =  self.cache.get(cache_key);
    if (v) {
      v.queryExecutionTime = new Date().getTime() - start;
      return Promise.resolve(v);
    }
  }

  return rp({
    method: 'GET',
    uri: url.parse(datasource.uri),
    qs: {
      format: 'application/sparql-results+json',
      query: query
    },
    timeout: datasource.timeout || 1000,
    transform: function (resp) {
      var data = JSON.parse(resp);

      if (idVariableName) {
        data.ids = self._extractIds(data, idVariableName);
      } else {
        data.ids = [];
      }
      data.queryActivated = true;

      // here do not be tempted to store the whole config object
      // just pick the properties you need
      // as this data object will be cached and we do not want the cached object
      // to be bigger than needed
      if (!onlyIds) {
        data.config = {
          label: self.config.label,
          esFieldName: self.config.esFieldName
        };
      } else {
        delete data.head;
        delete data.results;
      }

      if (self.cache) {
        self.cache.set(cache_key, data, datasource.maxAge);
      }

      data.debug = {
        sentDatasourceId: self.config.datasourceId,
        sentResultQuery: query,
        queryExecutionTime: new Date().getTime() - start
      };

      return data;
    }
  });
};

SparqlQuery.prototype._postprocessResults = function (data) {
  var options = this.config;

  for (var i = 0; i < data.results.bindings.length; i++) {
    for (var prop in data.results.bindings[i]) {
      if (data.results.bindings[i][prop].type === 'uri') {
        if (options && options.queryPrefixes) {
          data.results.bindings[i][prop].label = data.results.bindings[i][prop].value;
          for (var prefix in options.queryPrefixes) {
            if (options.queryPrefixes.hasOwnProperty(prefix)) {
              var replaceFrom = options.queryPrefixes[prefix];
              var replaceTo = prefix + ':';
              if (data.results.bindings[i][prop].value.indexOf(replaceFrom) === 0) {
                data.results.bindings[i][prop].label = data.results.bindings[i][prop].value.replace(replaceFrom, replaceTo);
                break;
              }
            }
          }
        } else {
          data.results.bindings[i][prop].label = data.results.bindings[i][prop].value;
        }
      } else {
        data.results.bindings[i][prop].label = data.results.bindings[i][prop].value;
      }
    }
  }
  return data;
};



module.exports = SparqlQuery;
