import _ from 'lodash';
import fs from 'fs';
import Promise from 'bluebird';
import url from 'url';
import rp from 'request-promise';
import logger from '../logger';
import AbstractQuery from './abstract_query';
import QueryHelper from '../query_helper';

function TinkerPop3Query(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.server = server;
}

TinkerPop3Query.prototype = _.create(AbstractQuery.prototype, {
  'constructor': TinkerPop3Query
});

/*
 * Return a promise which when resolved should return true or false.
 */
TinkerPop3Query.prototype.checkIfItIsRelevant = function (options) {
  if (this._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the tinkerpop query. [' + this.config.id + ']');
    return Promise.resolve(Symbol.for('selected document needed'));
  }

  return Promise.resolve(Symbol.for('query is relevant'));
};

TinkerPop3Query.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  const self = this;
  const start = new Date().getTime();

  const gremlinUrl = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  const ca = this.server.config().get('kibi_core.gremlin_server.ssl.ca');
  const maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  let timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  const cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  const parsedTimeout = parseInt(timeout);
  if (isNaN(parsedTimeout)) {
    return Promise.reject({
      error: 'Invalid timeout',
      message: 'Invalid timeout: ' + timeout
    });
  }
  timeout = parsedTimeout;

  return self.queryHelper.replaceVariablesUsingEsDocument(self.config.resultQuery, options, 'tinkerpop3_query')
  .then(function (query) {

    let cacheKey;
    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(gremlinUrl, query, onlyIds, idVariableName, self._getUsername(options));
      const v = self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return Promise.all([
      self.queryHelper.fetchDocuments('config'),
      self.queryHelper.fetchDocuments('index-pattern')
    ])
    .then(function ([ configHits, indexPatternHits ]) {
      let kibiRelations = null;
      const serverVersion = self.server.config().get('pkg').kibiVersion;
      const configDocs = configHits.hits.total && _.filter(configHits.hits.hits, '_id', serverVersion) || [];

      if (configDocs.length === 0) {
        return Promise.reject(new Error('No config documents found'));
      } else if (configDocs.length > 1) {
        return Promise.reject(new Error('Multiple config documents found'));
      } else {
        kibiRelations = configDocs[0]._source['kibi:relations'];
      }
      if (!kibiRelations) {
        const msg = 'Missing the settings of relations between indices. Please add them via the Settings/Relations panel';
        return Promise.reject(new Error(msg));
      }

      const indexPatterns = {};

      _.each(indexPatternHits.hits.hits, function (hit) {
        const indexPattern = {
          includedFields : [],
          excludedFields : []
        };

        if (hit._source && hit._source.sourceFiltering) {
          const sourceFiltering = JSON.parse(hit._source.sourceFiltering);
          let exFields;
          let inFields;

          if (sourceFiltering.kibi_graph_browser && sourceFiltering.kibi_graph_browser.exclude) {
            exFields = sourceFiltering.kibi_graph_browser.exclude;
          } else if (sourceFiltering.all && sourceFiltering.all.exclude) {
            exFields = sourceFiltering.all.exclude;
          }

          if (sourceFiltering.kibi_graph_browser && sourceFiltering.kibi_graph_browser.include) {
            inFields = sourceFiltering.kibi_graph_browser.include;
          } else if (sourceFiltering.all && sourceFiltering.all.include) {
            inFields = sourceFiltering.all.include;
          }

          if (exFields) {
            if (exFields.constructor === Array) {
              _.each(exFields, function (field) {
                indexPattern.excludedFields.push(field);
              });
            } else {
              indexPattern.excludedFields.push(exFields);
            }
          }

          if (inFields) {
            if (inFields.constructor === Array) {
              _.each(inFields, function (field) {
                indexPattern.includedFields.push(field);
              });
            } else {
              indexPattern.includedFields.push(inFields);
            }
          }

          indexPatterns[hit._source.title] = indexPattern;
        }

      });

      const kibiRelationsJson = JSON.parse(kibiRelations);

      const gremlinOptions = {
        method: 'POST',
        uri: gremlinUrl,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=UTF-8'
        },
        json: {
          queries: [query],
          relationsIndices: kibiRelationsJson.relationsIndices,
          credentials: options.credentials,
          indexPatterns: indexPatterns,
        },
        timeout: timeout
      };
      if (ca) {
        gremlinOptions.ca = fs.readFileSync(ca);
      }

      return rp(gremlinOptions).then(function (parsed) {
        const data = {
          result: parsed[0]
        };

        if (idVariableName) {
          data.ids = self._extractIds(data, idVariableName);
        } else {
          data.ids = [];
        }
        data.queryActivated = true;

        if (!onlyIds) {
          let fields;

          data.head = {
            vars: []
          };
          data.config = {
            label: self.config.label,
            esFieldName: self.config.esFieldName
          };

          data.results = {
            bindings: _.map(data.results, function (result) {
              const res = {};

              if (!fields) {
                fields = Object.keys(result);
              }
              for (const v in result) {
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

        if (self.cache && cacheEnabled) {
          self.cache.set(cacheKey, data, maxAge);
        }

        data.debug = {
          sentDatasourceId: self.config.datasourceId,
          sentResultQuery: query,
          queryExecutionTime: new Date().getTime() - start
        };

        return data;
      }).catch(function (error) {
        if (error.error.code === 'ETIMEDOUT') {
          error.message = 'Connection timeout. Please check that the Kibi Gremlin Server is up and running';
        }
        return error;
      });
    });

  });

};

TinkerPop3Query.prototype._extractIds = function (data, idVariableName) {
  const ids = [];
  if (data && data.results) {
    for (let i = 0; i < data.results.bindings.length; i++) {
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
