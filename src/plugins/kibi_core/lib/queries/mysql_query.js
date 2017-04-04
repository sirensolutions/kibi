var { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } = require('../_symbols');
var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var mysql   = require('mysql');
var AbstractQuery = require('./abstract_query');
var QueryHelper = require('../query_helper');

var debug = false;

function MysqlQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.logger = require('../logger')(server, 'mysql_query');
}

MysqlQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': MysqlQuery
});

MysqlQuery.prototype._getType = function (typeNum) {
  // Look here https://github.com/felixge/node-mysql/blob/6e87af8cdd40e9fac72d026b049cdd9a24829de5/lib/protocol/constants/types.js
  var types = {
    0: 'DECIMAL',
    1: 'TINY',
    2: 'SHORT',
    3: 'LONG',
    4: 'FLOAT',
    5: 'DOUBLE',
    6: 'NULL',
    7: 'TIMESTAMP',
    8: 'LONGLONG',
    9: 'INT24',
    10: 'DATE',
    11: 'TIME',
    12: 'DATETIME',
    13: 'YEAR',
    14: 'NEWDATE',
    15: 'VARCHAR',
    16: 'BIT',
    246: 'NEWDECIMAL',
    247: 'ENUM',
    248: 'SET',
    249: 'TINY_BLOB',
    250: 'MEDIUM_BLOB',
    251: 'LONG_BLOB',
    252: 'BLOB',
    253: 'VAR_STRING',
    254: 'STRING',
    255: 'GEOMETRY'
  };
  return types[typeNum] ? types[typeNum] : typeNum;
};

MysqlQuery.prototype._executeQuery = function (query, connectionString, timeout) {
  return new Promise(function (fulfill, reject) {
    var connection;
    try {
      connection = mysql.createConnection(connectionString);
      connection.connect();
      connection.query({sql: query, timeout: timeout || 1000}, function (err, rows, fields) {
        if (err) {
          if (err.message) {
            err = {
              error: err,
              message: err.message
            };
          }

          reject(err);
          return;
        }
        fulfill({rows: rows, fields: fields});
      });
    } catch (err) {
      reject(err);
    } finally {
      if (connection) {
        connection.end();
      }
    }
  });
};

/*
 * Return a promise which when resolved should return true or false
 */
MysqlQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the mysql query. [' + self.config.id + ']');
    return Promise.resolve(SELECTED_DOCUMENT_NEEDED);
  }

  var connectionString = this.config.datasource.datasourceClazz.getConnectionString();
  var host = this.config.datasource.datasourceClazz.datasource.datasourceParams.host;
  var dbname = this.config.datasource.datasourceClazz.datasource.datasourceParams.dbname;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  if (!this.config.activationQuery) {
    return Promise.resolve(QUERY_RELEVANT);
  }
  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, options)
  .then(function (query) {

    if (query.trim() === '') {
      return Promise.resolve(QUERY_RELEVANT);
    }

    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(host + dbname, query, self._getUsername(options));
      const v = self.cache.get(cacheKey);
      if (v !== undefined) {
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, connectionString, timeout).then(function (results) {
      const isRelevant = results.rows.length > 0 ? QUERY_RELEVANT : QUERY_DEACTIVATED;

      if (self.cache && cacheEnabled) {
        self.cache.set(cacheKey, isRelevant, maxAge);
      }

      return isRelevant;
    });

  });
};


MysqlQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  const start = new Date().getTime();
  const self = this;

  var connectionString = this.config.datasource.datasourceClazz.getConnectionString();
  var host = this.config.datasource.datasourceClazz.datasource.datasourceParams.host;
  var dbname = this.config.datasource.datasourceClazz.datasource.datasourceParams.dbname;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, options)
  .then(function (query) {

    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(host + dbname, query, onlyIds, idVariableName, self._getUsername(options));
      var v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, connectionString, timeout).then(function (results) {
      var data = {
        ids: [],
        queryActivated: true
      };
      if (!onlyIds) {
        var _varTypes = {};
        _.each(results.fields, function (field) {
          _varTypes[field.name] = self._getType(field.type);
        });

        data.head = {
          vars: _.map(results.fields, function (field) {
            return field.name;
          })
        };
        data.config = {
          label: self.config.label,
          esFieldName: self.config.esFieldName
        };
        data.results = {
          bindings: _.map(results.rows, function (row) {
            var res = {};
            for (var v in row) {
              if (row.hasOwnProperty(v)) {
                res[v] = {
                  type: _varTypes[v],
                  value: row[v]
                };
              }
            }
            return res;
          })
        };
      }

      if (idVariableName) {
        data.ids = self._extractIdsFromSql(results.rows, idVariableName);
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

MysqlQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = MysqlQuery;
