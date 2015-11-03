var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var config  = require('../../config');
var logger  = require('../logger');
var AbstractQuery = require('./abstractQuery');
var JdbcHelper    = require('./jdbcHelper');
var jdbcHelper = new JdbcHelper();
var Jdbc    = require('jdbc');
var queryHelper = require('./query_helper');
var debug = false;

function JdbcQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
  this.initialized = false;
  this.jdbc = new Jdbc();
}

JdbcQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': JdbcQuery
});

JdbcQuery.prototype._init = function () {
  var self = this;
  if (self.initialized === true) {
    return Promise.resolve({'message': 'JDBC driver already initialized.'});
  }

  var jdbcConfig = jdbcHelper.prepareJdbcConfig(self.config.datasource.datasourceParams);

  return new Promise(function (fulfill, reject) {
    try {
      self.jdbc.initialize(jdbcConfig, function (err, res) {
        if (err) {
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
  setTimeout(function () {

    conn.close(function (err) {
      if (err) {
        logger.error(err);
      }
    });

  }, 100);
};

/* return a promise which when resolved should return
 * a following response object
 * {
 *    "boolean": true/false
 * }
 */
JdbcQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  return self._init().then(function (data) {

    if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
      logger.warn('No elasticsearch document selected while required by the jdbc activation query. [' + self.config.id + ']');
      return Promise.resolve({'boolean': false});
    }
    var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

    // here do not use getConnectionString method as it might contain sensitive information like decrypted password
    var connection_string = self.config.datasource.datasourceClazz.datasource.datasourceParams.connection_string;
    var max_age = self.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;

    return queryHelper.replaceVariablesUsingEsDocument(self.config.activationQuery, uri).then(function (query) {

      if (query.trim() === '') {
        return Promise.resolve({'boolean': true});
      }

      var cache_key = null;

      if (self.cache) {
        cache_key = self.generateCacheKey(connection_string, query);
        var v = self.cache.get(cache_key);
        if (v) {
          return Promise.resolve(v);
        }
      }

      return new Promise(function (fulfill, reject) {
        self.jdbc.open(function (err, conn) {
          if (err) {
            reject(err);
          }

          if (conn) {
            self.jdbc.executeQuery(query, function (err, results) {
              if (err) {
                reject(err);
              }
              // do something
              var data = {'boolean': results.length > 0 ? true : false};
              if (self.cache) {
                self.cache.set(cache_key, data, max_age);
              }
              fulfill(data);
              self._closeConnection(conn);
            });
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

    var connection_string = self.config.datasource.datasourceClazz.datasource.datasourceParams.connection_string;
    var max_age = self.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;

    return queryHelper.replaceVariablesUsingEsDocument(self.config.resultQuery, uri).then(function (query) {

      var cache_key = null;

      if (self.cache) {
        cache_key = self.generateCacheKey(connection_string, query, onlyIds, idVariableName);
        var v =  self.cache.get(cache_key);
        if (v) {
          v.queryExecutionTime = new Date().getTime() - start;
          return Promise.resolve(v);
        }
      }

      return new Promise(function (fulfill, reject) {
        self.jdbc.open(function (err, conn) {
          if (err) {
            reject(err);
          }

          if (conn) {
            self.jdbc.executeQuery(query, function (err, results) {
              if (err) {
                if (err.message) {
                  err = {
                    error: err,
                    message: err.message
                  };
                }
                reject(err);
              }

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
                self.cache.set(cache_key, data, max_age);
              }

              data.debug = {
                sentDatasourceId: self.config.datasourceId,
                sentResultQuery: query,
                queryExecutionTime: new Date().getTime() - start
              };

              fulfill(data);
              self._closeConnection(conn);

            });
          }
        }); // end of jdbc open
      });
    });
  });
};

JdbcQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = JdbcQuery;
