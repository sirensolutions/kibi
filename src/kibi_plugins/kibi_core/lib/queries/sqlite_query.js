import logger from '../logger';
import _ from 'lodash';
import Promise from 'bluebird';
import url from 'url';
import sqlite3 from 'sqlite3';
import AbstractQuery from './abstract_query';
import QueryHelper from '../query_helper';
import path from 'path';

const debug = false;

function SQLiteQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.logger = logger(server, 'sqlite_query');
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
  let dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  const modes  = this.config.datasource.datasourceClazz.datasource.datasourceParams.modes;

  let timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  if (!timeout) {
    timeout = 1000;
  }
  timeout = parseInt(timeout);

  const self = this;
  return new Promise(function (fulfill, reject) {
    if (self._connection) {
      fulfill(self._connection);
      return;
    }
    if (dbfile && path.resolve(dbfile) !== path.normalize(dbfile)) {
      // if dbfile is not an absolute path
      const rootDir = process.env.ROOT_DIR;
      if (rootDir) {
        dbfile = path.join(rootDir, dbfile);
      }
    }

    let modeValue = 0;
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

    const db = new sqlite3.Database(dbfile, modeValue, function (error) {
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
  const self = this;
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
  const self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the sqlite query. [' + self.config.id + ']');
    return Promise.resolve(Symbol.for('selected document needed'));
  }

  const dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  const maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  const cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  if (!this.config.activationQuery) {
    return Promise.resolve(Symbol.for('query is relevant'));
  }
  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, options)
  .then(function (query) {

    if (query.trim() === '') {
      // TODO is this check necessary ? it seems the previous condition is enough
      return Promise.resolve(Symbol.for('query is relevant'));
    }

    let cacheKey = null;
    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(dbfile, query, self._getUsername(options));
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
};

/**
 * Executes the query.
 */
SQLiteQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  const start = new Date().getTime();
  const self = this;

  const dbfile = this.config.datasource.datasourceClazz.datasource.datasourceParams.db_file_path;
  const maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  const cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, options)
  .then(function (query) {

    let cacheKey = null;
    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(dbfile, query, onlyIds, idVariableName, self._getUsername(options));
      const v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query)
    .then(function (rows) {
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
          bindings: _.map(rows, function (row) {
            const res = {};

            if (!fields) {
              fields = Object.keys(row);
            }
            for (const v in row) {
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
