var _ = require('lodash');
var Promise = require('bluebird');
var url = require('url');
var sqlite3 = require('sqlite3');
var AbstractQuery = require('./abstract_query');
var QueryHelper = require('../query_helper');

var debug = false;


function SQLiteQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.logger = require('../logger')(server, 'sqlite_query');
}


SQLiteQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': SQLiteQuery
});


/**
 * Opens a connection to the database.
 *
 * Returns a promise that is fulfilled with a reference to the connection if
 * opened succesfully or rejected with an error.
 */
SQLiteQuery.prototype.openConnection = function () {
  var dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  var modes  = this.config.datasource.datasourceClazz.datasource.datasourceParams.modes;
  //TODO: how to pass one or more modes ??

  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  if (!timeout) {
    timeout = 1000;
  }
  timeout = parseInt(timeout);

  var self = this;
  return new Promise(function (fulfill, reject) {
    if (self._connection) {
      fulfill(self._connection);
      return;
    }
    var path = require('path');

    if (dbfile && path.resolve(dbfile) !== path.normalize(dbfile)) {
      // if dbfile is not an absolute path
      var rootDir = process.env.ROOT_DIR;
      if (rootDir) {
        dbfile = path.join(rootDir, dbfile);
      }
    }

    var db = new sqlite3.Database(dbfile, sqlite3.OPEN_READONLY, function (error) {
      if (error) {
        reject(self._augmentError(error));
        return;
      }

      self._connection = db;

      try {
        self._connection.configure('busyTimeout', timeout);
      } catch (error) {
        reject(self._augmentError({message: 'Invalid timeout: ' + timeout}));
        return;
      }

      fulfill(self._connection);
    });
  });
};


/**
 * Checks if the query is relevant (i.e. if it returns one or more rows).
 *
 * Returns a promise fulfilled with true or false.
 */
SQLiteQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the sqlite activation query. [' + self.config.id + ']');
    return Promise.resolve(false);
  }
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  if (!this.config.activationQuery) {
    return Promise.resolve(true);
  }
  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, uri, options.credentials).then(function (query) {

    if (query.trim() === '') {
      return Promise.resolve(true);
    }


    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(dbfile, query);
      var v = self.cache.get(cacheKey);
      if (v) {
        return Promise.resolve(v);
      }
    }

    return new Promise(function (fulfill, reject) {
      self.openConnection()
      .then(function (connection) {
        connection.get(query, function (error, row) {

          if (error) {
            reject(self._augmentError(error));
            return;
          }

          var data = row ? true : false;

          if (self.cache && cacheEnabled) {
            self.cache.set(cacheKey, data, maxAge);
          }

          fulfill(data);
        });
      })
      .catch(function (error) {
        reject(self._augmentError(error));
      });
    });
  });
};


/**
 * Executes the query.
 */
SQLiteQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;

  // special case - we can not simply reject the Promise
  // bacause this will cause the whole group of promises to be rejected
  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    return self._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }
  // currently we use only single selected document
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, uri, options.credentials).then(function (query) {

    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(dbfile, query, onlyIds, idVariableName);
      var v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return new Promise(function (fulfill, reject) {
      self.openConnection()
        .then(function (connection) {
          connection.all(query, function (error, rows) {
            if (error) {
              reject(self._augmentError(error));
              return;
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
                bindings: _.map(rows, function (row) {
                  var res = {};

                  if (!fields) {
                    fields = Object.keys(row);
                  }
                  for (var v in row) {
                    if (row.hasOwnProperty(v)) {
                      res[v] = {
                        type: 'unknown',
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
              data.ids = self._extractIdsFromSql(rows, idVariableName);
            }

            if (self.cache && cacheEnabled) {
              self.cache.set(cacheKey, data, maxAge);
            }

            data.debug = {
              sentDatasourceId: self.config.datasourceId,
              sentResultQuery: query,
              queryExecutionTime: new Date().getTime() - start
            };

            fulfill(data);
          });
        })
        .catch(function (error) {
          reject(self._augmentError(error));
        });
    });
  });
};

SQLiteQuery.prototype._postprocessResults = function (data) {
  return data;
};


SQLiteQuery.prototype._augmentError = function (error) {
  if (error.message) {
    error = {
      error: error,
      message: error.message
    };
  }
  return error;
};


module.exports = SQLiteQuery;
