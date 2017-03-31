import _ from 'lodash';
import url from 'url';
import Jdbc from 'jdbc';
import AbstractQuery from './abstract_query';
import JdbcHelper from '../jdbc_helper';
import QueryHelper from '../query_helper';
import logger from '../logger';

function JdbcQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.logger = logger(server, 'jdbc_query');
  this.initialized = false;
  this.jdbcHelper = new JdbcHelper(server);
  this.queryHelper = new QueryHelper(server);
}

JdbcQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': JdbcQuery
});

JdbcQuery.prototype._init = function () {
  const self = this;
  if (self.initialized === true) {
    return Promise.resolve({'message': 'JDBC driver already initialized.'});
  }

  const jdbcConfig = self.jdbcHelper.prepareJdbcConfig(self.config.datasource.datasourceParams);
  self.jdbc = new Jdbc(jdbcConfig);

  return new Promise(function (fulfill, reject) {
    try {
      self.jdbc.initialize(function (err, res) {
        if (err) {
          self.logger.error(err);
          reject(err);
          return;
        }
        self.initialized = true;
        fulfill({'message': 'JDBC driver initialized successfully.'});
      });
    } catch (err) {
      reject(err);
    }
  });
};


JdbcQuery.prototype._closeConnection = function (conn) {
  // here because of setImediate is used to process rows lets wait at least few ms to close the connection
  // without this the connection was getting close before setImmediate fired
  const self = this;

  setTimeout(function () {

    conn.close(function (err) {
      if (err) {
        self.logger.error(err);
      }
    });

  }, 100);
};

JdbcQuery.prototype._executeQuery = function (query) {
  const self = this;
  return new Promise(function (fulfill, reject) {
    self.jdbc.reserve(function (err, connObj) {
      if (err) {
        return reject(err);
      }
      if (connObj) {
        const conn = connObj.conn;
        conn.createStatement(function (err, statement) {
          if (err) {
            return reject(err);
          }
          statement.executeQuery(query, function (err, resultset) {
            if (err) {
              if (err.message) {
                err = {
                  error: err,
                  message: err.message
                };
              }
              self.jdbc.release(connObj, function (releaseError) {
                if (releaseError) {
                  self.logger.error(releaseError);
                }
                return reject(err);
              });
              return;
            }

            resultset.toObjArray(function (err, results) {
              self.jdbc.release(connObj, function (releaseError) {
                if (releaseError) {
                  self.logger.error(releaseError);
                  if (!err) {
                    return reject(releaseError);
                  }
                }
                if (err) {
                  return reject(err);
                }
                fulfill(results);
              });
            });
          });
        });
      } else {
        reject(new Error ('No connection object'));
      }
    });
  });
};

/*
 * Return a promise which when resolved should return true or false
 */
JdbcQuery.prototype.checkIfItIsRelevant = function (options) {
  const self = this;

  return self._init().then(function (data) {

    if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
      self.logger.warn('No elasticsearch document selected while required by the jdbc query. [' + self.config.id + ']');
      return Promise.resolve(Symbol.for('selected document needed'));
    }
    // here do not use getConnectionString method as it might contain sensitive information like decrypted password
    const connectionString = self.config.datasource.datasourceClazz.datasource.datasourceParams.connection_string;
    const maxAge = self.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
    const cacheEnabled = self.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

    if (!this.config.activationQuery) {
      return Promise.resolve(Symbol.for('query is relevant'));
    }
    return self.queryHelper.replaceVariablesUsingEsDocument(self.config.activationQuery, options)
    .then(function (query) {

      if (query.trim() === '') {
        return Promise.resolve(Symbol.for('query is relevant'));
      }

      let cacheKey = null;

      if (self.cache && cacheEnabled) {
        cacheKey = self.generateCacheKey(connectionString, query, self._getUsername(options));
        const v = self.cache.get(cacheKey);
        if (v !== undefined) {
          return Promise.resolve(v);
        }
      }

      return self._executeQuery(query).then(function (results) {
        const isRelevant = results.length > 0 ? Symbol.for('query is relevant') : Symbol.for('query should be deactivated');

        if (self.cache && cacheEnabled) {
          self.cache.set(cacheKey, isRelevant, maxAge);
        }

        return isRelevant;
      });
    });
  });
};

JdbcQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  const self = this;
  return self._init().then(function (data) {

    const start = new Date().getTime();

    const connectionString = self.config.datasource.datasourceClazz.datasource.datasourceParams.connection_string;
    const maxAge = self.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
    const cacheEnabled = self.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

    return self.queryHelper.replaceVariablesUsingEsDocument(self.config.resultQuery, options)
    .then(function (query) {
      let cacheKey = null;
      if (self.cache && cacheEnabled) {
        cacheKey = self.generateCacheKey(connectionString, query, onlyIds, idVariableName, self._getUsername(options));
        const v =  self.cache.get(cacheKey);
        if (v) {
          v.queryExecutionTime = new Date().getTime() - start;
          return Promise.resolve(v);
        }
      }

      return self._executeQuery(query).then(function (results) {
        // =============== here process the data ============
        const data = {
          ids: [],
          queryActivated: true
        };

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
            bindings: _.map(results, function (row) {
              const res = {};

              if (!fields) {
                fields = Object.keys(row);
              }
              for (const v in row) {
                if (row.hasOwnProperty(v)) {
                  res[v] = {
                    type: 'unknown', // the driver does not return any information about the fields
                    value: row[v]
                  };
                }
              }
              return res;
            })
          };

          if (fields) {
            data.head.vars = fields;
          }
        }

        if (idVariableName) {
          data.ids = self._extractIdsFromSql(results, idVariableName);
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
        // =============== here process the data ============
      });
    });
  });
};

JdbcQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = JdbcQuery;
