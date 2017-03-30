var { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } = require('../_symbols');
var _       = require('lodash');
var Promise = require('bluebird');
var rp      = require('request-promise');
var url     = require('url');
var http    = require('http');
var AbstractQuery = require('./abstract_query');
var QueryHelper = require('../query_helper');

function SparqlQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.logger = require('../logger')(server, 'sparql_query');
}

SparqlQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': SparqlQuery
});

SparqlQuery.prototype._executeQuery = function (query, endpointUrl, timeout) {
  return rp({
    method: 'GET',
    uri: url.parse(endpointUrl),
    qs: {
      format: 'application/sparql-results+json',
      query: query
    },
    timeout: timeout || 1000,
    transform: function (resp) {
      return JSON.parse(resp);
    }
  });
};

/**
 * Return a promise which when resolved should return true or false
 */
SparqlQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the sparql query. [' + self.config.id + ']');
    return Promise.resolve(SELECTED_DOCUMENT_NEEDED);
  }

  var endpointUrl = this.config.datasource.datasourceClazz.datasource.datasourceParams.endpoint_url;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  if (!this.config.activationQuery) {
    return Promise.resolve(QUERY_RELEVANT);
  }
  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, options)
  .then(function (queryNoPrefixes) {

    if (queryNoPrefixes.trim() === '') {
      return Promise.resolve(QUERY_RELEVANT);
    }

    var query = self.config.prefixesString + ' ' + queryNoPrefixes;
    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(endpointUrl, query, self._getUsername(options));
      const v = self.cache.get(cacheKey);
      if (v !== undefined) {
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, endpointUrl, timeout).then(function (data) {
      const isRelevant = data.boolean ? QUERY_RELEVANT : QUERY_DEACTIVATED;

      if (self.cache && cacheEnabled) {
        self.cache.set(cacheKey, isRelevant, maxAge);
      }

      return isRelevant;
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

  var endpointUrl = this.config.datasource.datasourceClazz.datasource.datasourceParams.endpoint_url;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, options).then(function (query) {

    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(endpointUrl, query, onlyIds, idVariableName, self._getUsername(options));
      var v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, endpointUrl, timeout).then(function (data) {
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

      if (self.cache && cacheEnabled) {
        self.cache.set(cacheKey, data, maxAge);
      }

      data.debug = {
        sentDatasourceId: self.config.datasourceId,
        sentResultQuery: query,
        queryExecutionTime: new Date().getTime() - start
      };

      return data;
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
