var _ = require('lodash');
var Promise = require('bluebird');
var url = require('url');
var rp = require('request-promise');
var logger = require('../logger');
var AbstractQuery = require('./abstract_query');
var QueryHelper = require('../query_helper');

function TinkerPop3Query(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
}

TinkerPop3Query.prototype = _.create(AbstractQuery.prototype, {
  'constructor': TinkerPop3Query
});

TinkerPop3Query.prototype.checkIfItIsRelevant = function (options) {
  if (this._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    return Promise.reject('No elasticsearch document selected while required by the activation query. [' + this.config.id + ']');
  }

  return Promise.resolve({'boolean': true});
};


TinkerPop3Query.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var self = this;
  var start = new Date().getTime();

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    return self._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }

  var gremlinUrl = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;

  if (timeout === null || typeof timeout === 'undefined') {
    timeout = 5000;
  }

  var parsedTimeout = parseInt(timeout);
  if (isNaN(parsedTimeout)) {
    return Promise.reject({
      'error': 'Invalid timeout',
      'message': 'Invalid timeout: ' + timeout
    });
  }
  timeout = parsedTimeout;

  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  return self.queryHelper.replaceVariablesUsingEsDocument(self.config.resultQuery, uri).then(function (query) {

    var cacheKey = self.generateCacheKey(gremlinUrl, query, onlyIds, idVariableName);

    if (self.cache) {
      var v = self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return Promise.all([
      self.queryHelper.fetchDocuments('index-pattern'),
      self.queryHelper.fetchDocuments('config')
    ]).then(function (results) {
      var patterns = results[0];
      var config = results[1];

      var indices = null;
      if (patterns.hits.total > 0) {
        indices = _.map(patterns.hits.hits, function (hit) {
          return hit._id;
        });
      }

      var kibiRelations = null;
      var configDocs = _.drop(config.hits.hits, function (doc) {
        return doc._id !== self.config.get('pkg').version;
      });
      if (configDocs.length === 0) {
        Promise.reject(new Error('No config documents found'));
      } else if (configDocs.length > 1) {
        Promise.reject(new Error('Multiple config documents found'));
      } else {
        kibiRelations = configDocs[0]._source['kibi:relations'];
      }

      var kibiRelationsJson = JSON.parse(kibiRelations);

      var options = {
        method: 'POST',
        uri: gremlinUrl,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=UTF-8'
        },
        json: {
          query: query,
          relationsIndices: kibiRelationsJson.relationsIndices,
          indices: indices
        },
        timeout: timeout
      };

      return rp(options).then(function (parsed) {
        var data = {
          result: parsed
        };

        if (idVariableName) {
          data.ids = self._extractIds(data, idVariableName);
        } else {
          data.ids = [];
        }
        data.queryActivated = true;

        if (!onlyIds) {
          var fields;

          data.head = {
            vars: []
          };
          data.config = {
            label: self.config.label,
            esFieldName: self.config.esFieldName
          };

          data.results = {
            bindings: _.map(data.results, function (result) {
              var res = {};

              if (!fields) {
                fields = Object.keys(result);
              }
              for (var v in result) {
                if (result.hasOwnProperty(v)) {
                  res[v] = {
                    type: 'unknown',
                    value: result[v]
                  };
                }
              }

              return res;
            })
          };

          if (fields) {
            data.head.vars = fields;
          }
        } else {
          delete data.head;
          delete data.results;
        }

        if (self.cache) {
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

  });

};

TinkerPop3Query.prototype._extractIds = function (data, idVariableName) {
  var ids = [];
  if (data && data.results) {
    for (var i = 0; i < data.results.bindings.length; i++) {
      if (data.results.bindings[i][idVariableName]) {
        ids.push(data.results.bindings[i][idVariableName].value);
      }
    }
  }
  return ids;
};

TinkerPop3Query.prototype._postprocessResults = function (data) {
  return data;
};

module.exports = TinkerPop3Query;
