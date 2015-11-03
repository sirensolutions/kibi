var _       = require('lodash');
var Promise = require('bluebird');
var rp      = require('request-promise');
var url     = require('url');
var http    = require('http');
var config  = require('../../config');
var AbstractQuery = require('./abstractQuery');
var queryHelper = require('./query_helper');
var logger  = require('../logger');

function SparqlQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
}

SparqlQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': SparqlQuery
});


// return a promise which when resolved should return
// a following response object
// {
//    "boolean": true/false
// }
SparqlQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    logger.warn('No elasticsearch document selected while required by the sparql activation query. [' + self.config.id + ']');
    return Promise.resolve({'boolean': false});
  }
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var endpoint_url = this.config.datasource.datasourceClazz.datasource.datasourceParams.endpoint_url;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;

  return queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, uri).then(function (queryNoPrefixes) {

    if (queryNoPrefixes.trim() === '') {
      return Promise.resolve({'boolean': true});
    }

    var query = self.config.prefixesString + ' ' + queryNoPrefixes;
    var cache_key = null;

    if (self.cache) {
      cache_key = self.generateCacheKey(endpoint_url, query);
      var v = self.cache.get(cache_key);
      if (v) {
        return Promise.resolve(v);
      }
    }

    return rp({
      method: 'GET',
      uri: url.parse(endpoint_url),
      qs: {
        format: 'application/sparql-results+json',
        query: query
      },
      timeout: timeout || 1000,
      transform: function (resp) {
        var data = JSON.parse(resp);
        if (self.cache) {
          self.cache.set(cache_key, data, max_age);
        }
        return data;
      }
    });
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


SparqlQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;

  // special case - we can not simply reject the Promise
  // bacause this will cause the whole group of promissses to be rejected
  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    return self._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }
  // currently we use only single selected document
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var endpoint_url = this.config.datasource.datasourceClazz.datasource.datasourceParams.endpoint_url;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;

  return queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, uri).then(function (query) {

    var cache_key = null;

    if (self.cache) {
      cache_key = self.generateCacheKey(endpoint_url, query, onlyIds, idVariableName);
      var v =  self.cache.get(cache_key);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return rp({
      method: 'GET',
      uri: url.parse(endpoint_url),
      qs: {
        format: 'application/sparql-results+json',
        query: query
      },
      timeout: timeout || 1000,
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
          self.cache.set(cache_key, data, max_age);
        }

        data.debug = {
          sentDatasourceId: self.config.datasourceId,
          sentResultQuery: query,
          queryExecutionTime: new Date().getTime() - start
        };

        return data;
      }
    });
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
