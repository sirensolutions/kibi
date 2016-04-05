var _       = require('lodash');
var url     = require('url');
var Jdbc    = require('jdbc');
var AbstractQuery = require('./abstract_query');
var JdbcHelper    = require('../jdbc_helper');
var QueryHelper = require('../query_helper');

var debug = false;

function JdbcQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.logger = require('../logger')(server, 'jdbc_query');
  this.initialized = false;
  this.jdbcHelper = new JdbcHelper(server);
  this.queryHelper = new QueryHelper(server);
}

JdbcQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': JdbcQuery
});

JdbcQuery.prototype._init = function () {
  var self = this;
  if (self.initialized === true) {
    return Promise.resolve({'message': 'JDBC driver already initialized.'});
  }

  var jdbcConfig = self.jdbcHelper.prepareJdbcConfig(self.config.datasource.datasourceParams);
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
  var self = this;

  setTimeout(function () {

    conn.close(function (err) {
      if (err) {
        self.logger.error(err);
      }
    });

  }, 100);
};

/*
 * Return a promise which when resolved should return true or false
 */
JdbcQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  return self._init().then(function (data) {

    if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
      self.logger.warn('No elasticsearch document selected while required by the jdbc activation query. [' + self.config.id + ']');
      return Promise.resolve(false);
    }
    var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

    // here do not use getConnectionString method as it might contain sensitive information like decrypted password
    var connectionString = self.config.datasource.datasourceClazz.datasource.datasourceParams.connectionString;
    var maxAge = self.config.datasource.datasourceClazz.datasource.datasourceParams.maxAge;

    return self.queryHelper.replaceVariablesUsingEsDocument(self.config.activationQuery, uri, options.credentials).then(function (query) {

      if (query.trim() === '') {
        return Promise.resolve(true);
      }

      var cacheKey = null;

      if (self.cache) {
        cacheKey = self.generateCacheKey(connectionString, query);
        var v = self.cache.get(cacheKey);
        if (v) {
          return Promise.resolve(v);
        }
      }

      return new Promise(function (fulfill, reject) {
        self.jdbc.reserve(function (err, connObj) {
          if (err) {
            reject(err);
          }
          if (connObj) {
            // Grab the Connection for use.
            var conn = connObj.conn;
            conn.createStatement(function (err, statement) {
              if (err) {
                reject(err);
              }
              statement.executeQuery(query, function (err, resultset) {
                if (err) {
                  if (err.message) {
                    err = {
                      error: err,
                      message: err.message
                    };
                  }
                  reject(err);
                }

                resultset.toObjArray(function (err, results) {
                  if (err) {
                    reject(err);
                  }
                  var data = results.length > 0 ? true : false;
                  if (self.cache) {
                    self.cache.set(cacheKey, data, maxAge);
                  }
                  fulfill(data);
                  self.jdbc.release(connObj, function (err) {
                    if (err) {
                      self.logger.error(err);
                    }
                  });

                });
              });
            });

          } else {
            reject(new Error ('No connection object'));
          }
        });
      });
    });
  });
};

JdbcQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var self = this;
  return self._init().then(function (data) {

    var start = new Date().getTime();
    // special case - we can not simply reject the Promise
    // bacause it will cause the whole group of promissses to be rejected
    if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
      return self._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
    }
    // currently we use only single selected document
    var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

    var connectionString = self.config.datasource.datasourceClazz.datasource.datasourceParams.connectionString;
    var maxAge = self.config.datasource.datasourceClazz.datasource.datasourceParams.maxAge;

    return self.queryHelper.replaceVariablesUsingEsDocument(self.config.resultQuery, uri, options.credentials).then(function (query) {

      var cacheKey = null;

      if (self.cache) {
        cacheKey = self.generateCacheKey(connectionString, query, onlyIds, idVariableName);
        var v =  self.cache.get(cacheKey);
        if (v) {
          v.queryExecutionTime = new Date().getTime() - start;
          return Promise.resolve(v);
        }
      }

      return new Promise(function (fulfill, reject) {

        self.jdbc.reserve(function (err, connObj) {
          if (err) {
            reject(err);
          }
          if (connObj) {
            // Grab the Connection for use.
            var conn = connObj.conn;
            conn.createStatement(function (err, statement) {
              if (err) {
                reject(err);
              }
              statement.executeQuery(query, function (err, resultset) {
                if (err) {
                  if (err.message) {
                    err = {
                      error: err,
                      message: err.message
                    };
                  }
                  reject(err);
                }

                resultset.toObjArray(function (err, results) {
                  if (err) {
                    reject(err);
                  }

                  // =============== here process the data ============
                  var data = {
                    ids: [],
                    queryActivated: true
                  };

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
                      bindings: _.map(results, function (row) {
                        var res = {};

                        if (!fields) {
                          fields = Object.keys(row);
                        }
                        for (var v in row) {
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

                  if (self.cache) {
                    self.cache.set(cacheKey, data, maxAge);
                  }

                  data.debug = {
                    sentDatasourceId: self.config.datasourceId,
                    sentResultQuery: query,
                    queryExecutionTime: new Date().getTime() - start
                  };

                  fulfill(data);
                  // =============== here process the data ============

                  self.jdbc.release(connObj, function (err) {
                    if (err) {
                      self.logger.erro(err);
                    }
                  });

                });
              });
            });

          } else {
            reject(new Error ('No connection object'));
          }
        });
      });
    });
  });
};

JdbcQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = JdbcQuery;
