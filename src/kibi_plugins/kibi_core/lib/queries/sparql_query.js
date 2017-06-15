import { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } from '../_symbols';
import logger from '../logger';
import _ from 'lodash';
import Promise from 'bluebird';
import rp from 'request-promise';
import url from 'url';
import http from 'http';
import AbstractQuery from './abstract_query';
import QueryHelper from '../query_helper';

function SparqlQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.logger = logger(server, 'sparql_query');
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
  const self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the sparql query. [' + self.config.id + ']');
    return Promise.resolve(SELECTED_DOCUMENT_NEEDED);
  }

  const endpointUrl = this.config.datasource.datasourceClazz.datasource.datasourceParams.endpoint_url;
  const timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  const maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  const cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  if (!this.config.activationQuery) {
    return Promise.resolve(QUERY_RELEVANT);
  }
  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, options)
  .then(function (queryNoPrefixes) {

    if (queryNoPrefixes.trim() === '') {
      return Promise.resolve(QUERY_RELEVANT);
    }

    const query = self.config.prefixesString + ' ' + queryNoPrefixes;
    let cacheKey = null;

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
  const ids = [];
  if (data && data.results && data.results.bindings) {
    for (let i = 0; i < data.results.bindings.length; i++) {
      if (data.results.bindings[i][idVariableName]) {
        ids.push(data.results.bindings[i][idVariableName].value);
      }
    }
  }
  return ids;
};


SparqlQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  const start = new Date().getTime();
  const self = this;

  const endpointUrl = this.config.datasource.datasourceClazz.datasource.datasourceParams.endpoint_url;
  const timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  const maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  const cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, options).then(function (query) {

    let cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(endpointUrl, query, onlyIds, idVariableName, self._getUsername(options));
      const v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, endpointUrl, timeout).then(function (data) {
      data.queryId = self.id;
      data.label = self.config.label;
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
  const options = this.config;

  for (let i = 0; i < data.results.bindings.length; i++) {
    for (const prop in data.results.bindings[i]) {
      if (data.results.bindings[i][prop].type === 'uri') {
        if (options && options.queryPrefixes) {
          data.results.bindings[i][prop].label = data.results.bindings[i][prop].value;
          for (const prefix in options.queryPrefixes) {
            if (options.queryPrefixes.hasOwnProperty(prefix)) {
              const replaceFrom = options.queryPrefixes[prefix];
              const replaceTo = prefix + ':';
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
