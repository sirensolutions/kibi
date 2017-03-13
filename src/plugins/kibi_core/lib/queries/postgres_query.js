var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var pg      = require('pg');
var AbstractQuery = require('./abstract_query');
var QueryHelper = require('../query_helper');

function PostgresQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.queryHelper = new QueryHelper(server);
  this.logger = require('../logger')(server, 'postgres_query');
}

PostgresQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': PostgresQuery
});

PostgresQuery.prototype._getType = function (typeNum) {
  // extracted from http://doxygen.postgresql.org/include_2catalog_2pg__type_8h_source.html
  var types = {
    16: 'BOOL',
    17: 'BYTEA',
    18: 'CHAR',
    19: 'NAME',
    20: 'INT8',
    21: 'INT2',
    22: 'INT2VECTOR',
    23: 'INT4',
    24: 'REGPROC',
    25: 'TEXT',
    26: 'OID',
    27: 'TID',
    28: 'XID',
    29: 'CID',
    30: 'OIDVECTOR',
    114: 'JSON',
    142: 'XML',
    194: 'PGNODETREE',
    600: 'POINT',
    601: 'LSEG',
    602: 'PATH',
    603: 'BOX',
    604: 'POLYGON',
    628: 'LINE',
    700: 'FLOAT4',
    701: 'FLOAT8',
    702: 'ABSTIME',
    703: 'RELTIME',
    704: 'TINTERVAL',
    705: 'UNKNOWN',
    718: 'CIRCLE',
    790: 'CASH',
    829: 'MACADDR',
    869: 'INET',
    650: 'CIDR',
    1005: 'INT2ARRAY',
    1007: 'INT4ARRAY',
    1009: 'TEXTARRAY',
    1028: 'OIDARRAY',
    1021: 'FLOAT4ARRAY',
    1033: 'ACLITEM',
    1263: 'CSTRINGARRAY',
    1042: 'BPCHAR',
    1043: 'VARCHAR',
    1082: 'DATE',
    1083: 'TIME',
    1114: 'TIMESTAMP',
    1184: 'TIMESTAMPTZ',
    1186: 'INTERVAL',
    1266: 'TIMETZ',
    1560: 'BIT',
    1562: 'VARBIT',
    1700: 'NUMERIC',
    1790: 'REFCURSOR',
    2202: 'REGPROCEDURE',
    2203: 'REGOPER',
    2204: 'REGOPERATOR',
    2205: 'REGCLASS',
    2206: 'REGTYPE',
    2211: 'REGTYPEARRAY',
    2950: 'UUID',
    3220: 'LSN',
    3614: 'TSVECTOR',
    3642: 'GTSVECTOR',
    3615: 'TSQUERY',
    3734: 'REGCONFIG',
    3769: 'REGDICTIONARY',
    3802: 'JSONB',
    3904: 'INT4RANGE',
    2249: 'RECORD',
    2287: 'RECORDARRAY',
    2275: 'CSTRING',
    2276: 'ANY',
    2277: 'ANYARRAY',
    2278: 'VOID',
    2279: 'TRIGGER',
    3838: 'EVTTRIGGER',
    2280: 'LANGUAGE_HANDLER',
    2281: 'INTERNAL',
    2282: 'OPAQUE',
    2283: 'ANYELEMENT',
    2776: 'ANYNONARRAY',
    3500: 'ANYENUM',
    3115: 'FDW_HANDLER',
    3831: 'ANYRANGE'
  };
  return types[typeNum] ? types[typeNum] : typeNum;
};

PostgresQuery.prototype._executeQuery = function (query, connectionString) {
  var self = this;
  return new Promise(function (fulfill, reject) {
    try {
      pg.connect(connectionString, function (err, client, done) {
        if (err) {
          reject(err);
          return;
        }

        self.logger.debug('got client');

        client.query(query, function (err, result) {
          if (err) {
            if (err.message) {
              err = {
                error: err,
                message: err.message
              };
            }

            self.logger.debug('got error instead of result');
            self.logger.debug(err);

            reject(err);
            return;
          }

          self.logger.debug('got result');

          fulfill(result);
          client.end();
          //done(); //TODO: investigate where exactly to call this method to release client to the pool
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

/*
 * Return a promise which when resolved should return true or false.
 */
PostgresQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    self.logger.warn('No elasticsearch document selected while required by the posgres query. [' + self.config.id + ']');
    return Promise.resolve(false);
  }
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var connectionString = this.config.datasource.datasourceClazz.getConnectionString();
  var host = this.config.datasource.datasourceClazz.datasource.datasourceParams.host;
  var dbname = this.config.datasource.datasourceClazz.datasource.datasourceParams.dbname;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, uri, options.credentials).then(function (query) {

    if (query.trim() === '') {
      return Promise.resolve(true);
    }

    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(host + dbname, query, self._getUsername(options));
      var v = self.cache.get(cacheKey);
      if (v) {
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, connectionString).then(function (result) {
      // szydan 29-Apr-2015: we've seen an error where for some reason
      // result was undefined. I was not able to reproduce this
      // adding extra check to reject the Promise in such situation
      if (result === undefined) {
        return Promise.reject(new Error('No rows property in results'));
      }
      var data = result.rows.length > 0 ? true : false;

      if (self.cache && cacheEnabled) {
        self.cache.set(cacheKey, data, maxAge);
      }
      return data;
    });

  });
};


PostgresQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;
  // currently we use only single selected document
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var connectionString = this.config.datasource.datasourceClazz.getConnectionString();
  var host = this.config.datasource.datasourceClazz.datasource.datasourceParams.host;
  var dbname = this.config.datasource.datasourceClazz.datasource.datasourceParams.dbname;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return self.queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, uri, options.credentials).then(function (query) {
    // special case if the uri is required but it is empty

    self.logger.debug(
      '----------\n' +
      'this.resultQueryRequireEntityURI: [' + self.resultQueryRequireEntityURI + ']\n' +
      'uri: [' + uri + ']\n' +
      'query: [' + query + ']'
    );


    self.logger.debug('start to fetch results for query');
    self.logger.debug(query);

    var cacheKey = null;

    if (self.cache && cacheEnabled) {
      cacheKey = self.generateCacheKey(host + dbname, query, onlyIds, idVariableName, self._getUsername(options));
      var v =  self.cache.get(cacheKey);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }

    return self._executeQuery(query, connectionString).then(function (result) {
      var data = {
        ids: [],
        queryActivated: true
      };
      if (!onlyIds) {
        var _varTypes = {};
        _.each(result.fields, function (field) {
          _varTypes[field.name] = self._getType(field.dataTypeID);
        });


        data.head = {
          vars: _.map(result.fields, function (field) {
            return field.name;
          })
        };
        data.config = {
          label: self.config.label,
          esFieldName: self.config.esFieldName
        };
        data.results = {
          bindings: _.map(result.rows, function (row) {
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
        data.ids = self._extractIdsFromSql(result.rows, idVariableName);
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

PostgresQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = PostgresQuery;
