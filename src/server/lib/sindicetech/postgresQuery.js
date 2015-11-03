var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var config  = require('../../config');
var pg      = require('pg');
var logger  = require('../logger');
var AbstractQuery = require('./abstractQuery');
var queryHelper = require('./query_helper');

var debug = false;

function PostgresQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
}

PostgresQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': PostgresQuery
});

/* return a promise which when resolved should return
 * a following response object
 * {
 *    "boolean": true/false
 * }
 */
PostgresQuery.prototype.checkIfItIsRelevant = function (options) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    logger.warn('No elasticsearch document selected while required by the posgres activation query. [' + self.config.id + ']');
    return Promise.resolve({'boolean': false});
  }
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var connectionString = this.config.datasource.datasourceClazz.getConnectionString();
  var host = this.config.datasource.datasourceClazz.datasource.datasourceParams.host;
  var dbname = this.config.datasource.datasourceClazz.datasource.datasourceParams.dbname;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;


  return queryHelper.replaceVariablesUsingEsDocument(this.config.activationQuery, uri).then(function (query) {

    if (query.trim() === '') {
      return Promise.resolve({'boolean': true});
    }

    var cache_key = null;

    if (self.cache) {
      cache_key = self.generateCacheKey(host + dbname, query);
      var v = self.cache.get(cache_key);
      if (v) {
        return Promise.resolve(v);
      }
    }

    return new Promise(function (fulfill, reject) {
      try {
        pg.connect(connectionString, function (err, client, done) {
          if (err) {
            reject(err);
          }
          client.query(query, function (err, result) {
            if (err) {
              reject(err);
            }
            // szydan 29-Apr-2015: we've seen an error where for some reason
            // result was undefined. I was not able to reproduce this
            // adding extra check to reject the Promise in such situation
            if (result === undefined) {
              reject(new Error('No rows property in results'));
            }
            var data = {'boolean': result.rows.length > 0 ? true : false};

            if (self.cache) {
              self.cache.set(cache_key, data, max_age);
            }
            fulfill(data);
            client.end();
            //done(); //TODO: investigate where exactly to call this method to release client to the pool
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};


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


PostgresQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;
  // special case - we can not simply reject the Promise
  // bacause this will cause the whole group of promissses to be rejected
  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    return self._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }
  // currently we use only single selected document
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var connectionString = this.config.datasource.datasourceClazz.getConnectionString();
  var host = this.config.datasource.datasourceClazz.datasource.datasourceParams.host;
  var dbname = this.config.datasource.datasourceClazz.datasource.datasourceParams.dbname;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;

  return queryHelper.replaceVariablesUsingEsDocument(this.config.resultQuery, uri).then(function (query) {
    // special case if the uri is required but it is empty
    if (debug) {
      console.log('----------');
      console.log('this.resultQueryRequireEntityURI: [' + this.resultQueryRequireEntityURI + ']');
      console.log('uri: [' + uri + ']');
      console.log('query: [' + query + ']');
    }


    if (debug) {
      console.log('start to fetch results for');
      console.log(query);
    }

    var cache_key = null;

    if (self.cache) {
      cache_key = self.generateCacheKey(host + dbname, query, onlyIds, idVariableName);
      var v =  self.cache.get(cache_key);
      if (v) {
        v.queryExecutionTime = new Date().getTime() - start;
        return Promise.resolve(v);
      }
    }


    return new Promise(function (fulfill, reject) {
      try {
        pg.connect(connectionString, function (err, client, done) {
          if (err) {
            reject(err);
            return;
          }

          if (debug) {
            console.log('got client');
          }


          client.query(query, function (err, result) {
            if (err) {
              if (err.message) {
                err = {
                  error: err,
                  message: err.message
                };
              }

              if (debug) {
                console.log('got error instead of result');
                console.log(err);
              }

              reject(err);
              return;
            }

            if (debug) {
              console.log('got result');
            }

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

            if (self.cache) {
              self.cache.set(cache_key, data, max_age);
            }

            data.debug = {
              sentDatasourceId: self.config.datasourceId,
              sentResultQuery: query,
              queryExecutionTime: new Date().getTime() - start
            };


            fulfill(data);
            client.end();
            //done(); //TODO: investigate where exactly to call this method to release client to the pool
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};

PostgresQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = PostgresQuery;
