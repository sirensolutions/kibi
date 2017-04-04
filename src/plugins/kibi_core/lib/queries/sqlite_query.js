var { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } = require('../_symbols');
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

    var modeValue = 0;
    _.each(modes, function (mode) {
      switch (mode) {
        case 'OPEN_READONLY':
          modeValue = modeValue | sqlite3.OPEN_READONLY;
          break;
        case 'OPEN_READWRITE':
          modeValue = modeValue | sqlite3.OPEN_READWRITE;
          break;
        case 'OPEN_CREATE':
          modeValue = modeValue | sqlite3.OPEN_CREATE;
          break;
      }
    });

    var db = new sqlite3.Database(dbfile, modeValue, function (error) {
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


SQLiteQuery.prototype._executeQuery = function (query) {
  var self = this;
  return new Promise(function (fulfill, reject) {
    self.openConnection().then(function (connection) {
      connection.all(query, function (error, result) {

        if (error) {
          reject(self._augmentError(error));
          return;
        }
        fulfill(result);
      });
    })
    .catch(function (error) {
      reject(self._augmentError(error));
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
    self.logger.warn('No elasticsearch document selected while required by the sqlite query. [' + self.config.id + ']');
    return Promise.resolve(SELECTED_DOCUMENT_NEEDED);
  }

  var dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  if (!this.config.activationQuery) {
    return Promise.resolve(QUERY_RELEVANT);
  }
  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, options)
  .then(function (query) {

    if (query.trim() === '') {
      // TODO is this check necessary ? it seems the previous condition is enough
      return Promise.resolve(QUERY_RELEVANT);
    }

    var cacheKey = null;
    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(dbfile, query, self._getUsername(options));
      const v = self.cache.get(cacheKey);
      if (v !== undefined) {
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query).then(function (results) {
      const isRelevant = results.length > 0 ? QUERY_RELEVANT : QUERY_DEACTIVATED;

      if (self.cache && cacheEnabled) {
        self.cache.set(cacheKey, isRelevant, maxAge);
      }

      return isRelevant;
    });
  });
};


/**
 * Executes the query.
 */
SQLiteQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;

  var dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, options)
  .then(function (query) {

    var cacheKey = null;
    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(dbfile, query, onlyIds, idVariableName, self._getUsername(options));
      var v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query).then(function (rows) {

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

      return data;
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
