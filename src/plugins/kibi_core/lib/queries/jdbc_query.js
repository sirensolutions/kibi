var _       = require('lodash');
var url     = require('url');
var Jdbc    = require('jdbc');
var AbstractQuery = require('./abstract_query');
var JdbcHelper    = require('../jdbc_helper');
var QueryHelper = require('../query_helper');

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

JdbcQuery.prototype._executeQuery = function (query) {
  var self = this;
  return new Promise(function (fulfill, reject) {
    self.jdbc.reserve(function (err, connObj) {
      if (err) {
        return reject(err);
      }
      if (connObj) {
        var conn = connObj.conn;
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
  var self = this;

  return self._init().then(function (data) {

    if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
      self.logger.warn('No elasticsearch document selected while required by the jdbc query. [' + self.config.id + ']');
      return Promise.resolve(false);
    }
    var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

    // here do not use getConnectionString method as it might contain sensitive information like decrypted password
    var connectionString = self.config.datasource.datasourceClazz.datasource.datasourceParams.connection_string;
    var maxAge = self.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
    var cacheEnabled = self.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

    return self.queryHelper.replaceVariablesUsingEsDocument(self.config.activationQuery, uri, options.credentials).then(function (query) {

      if (query.trim() === '') {
        return Promise.resolve(true);
      }

      var cacheKey = null;

      if (self.cache && cacheEnabled) {
        cacheKey = self.generateCacheKey(connectionString, query, self._getUsername(options));
        var v = self.cache.get(cacheKey);
        if (v) {
          return Promise.resolve(v);
        }
      }

      return self._executeQuery(query).then(function (results) {
        var data = results.length > 0 ? true : false;
        if (self.cache && cacheEnabled) {
          self.cache.set(cacheKey, data, maxAge);
        }
        return data;
      });
    });
  });
};

JdbcQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var self = this;
  return self._init().then(function (data) {

    var start = new Date().getTime();
    // currently we use only single selected document
    var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

    var connectionString = self.config.datasource.datasourceClazz.datasource.datasourceParams.connection_string;
    var maxAge = self.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
    var cacheEnabled = self.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

    return self.queryHelper.replaceVariablesUsingEsDocument(self.config.resultQuery, uri, options.credentials).then(function (query) {
      var cacheKey = null;
      if (self.cache && cacheEnabled) {
        cacheKey = self.generateCacheKey(connectionString, query, onlyIds, idVariableName, self._getUsername(options));
        var v =  self.cache.get(cacheKey);
        if (v) {
          v.queryExecutionTime = new Date().getTime() - start;
          return Promise.resolve(v);
        }
      }

      return self._executeQuery(query).then(function (results) {
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
