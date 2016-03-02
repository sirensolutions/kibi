var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var lru = require('lru-cache');
var rp = require('request-promise');
var url = require('url');
var logger = require('./logger');
var setDatasourceClazz = require('./datasources/set_datasource_clazz');
var SparqlQuery = require('./queries/sparql_query');
var MysqlQuery = require('./queries/mysql_query');
var PostgresQuery = require('./queries/postgres_query');
var SQLiteQuery = require('./queries/sqlite_query');
var RestQuery = require('./queries/rest_query');
var ErrorQuery = require('./queries/error_query');
var InactivatedQuery = require('./queries/inactivated_query');
var TinkerPop3Query;
var JdbcQuery;

function QueryEngine(server) {
  this.server = server;
  this.config = server.config();
  this.queries = [];
  this.initialized = false;
  this.log = logger(server, 'query_engine');
}

QueryEngine.prototype._init =  function (enableCache = false, cacheSize = 500, cacheMaxAge = 1000 * 60 * 60) {
  // populate an array templatesDefinitions which contain templatesdefinition objects
  var self = this;

  if (self.initialized === true) {
    return Promise.resolve({
      message: 'QueryEngine already initialized'
    });
  }

  if (self.config.get('kibi_core.enterprise_enabled')) {
    self.log.info('Loading enterprise components');
    TinkerPop3Query = require('./queries/tinkerpop3_query');
  }

  self.cache = null;

  if (enableCache) {
    var defaultSettings = {
      max: cacheSize,
      maxAge: cacheMaxAge
    };
    var lruCache = lru(defaultSettings);
    var cache = {
      set: function (key, value, maxAge) {
        lruCache.set(key, value, maxAge);
      },
      get: function (key) {
        return lruCache.get(key);
      },
      reset: function () {
        lruCache.reset();
      }
    };
    self.cache = cache;
  }

  return new Promise((fulfill, reject) => {
    var elasticsearchStatus = self.server.plugins.elasticsearch.status;

    elasticsearchStatus.on('change', function (prev, prevmsg) {
      if (elasticsearchStatus.state === 'green') {

        self._loadTemplatesMapping().then(function () {
          self._loadTemplates();
        }).catch(function (err) {
          self.logger.error('Could not load the mapping for tempalte object', err);
        });

        self.setupJDBC()
        .then(self.reloadQueries())
        .then(() => {
          self.initialized = true;
          fulfill({ message: 'QueryEngine initialized successfully.' });
        }).catch(reject);
      }
    });
  });

};


QueryEngine.prototype._loadTemplatesMapping =  function () {
  var self = this;

  // here prevent an issue where by default version field was mapped to type long
  var mapping = {
    properties: {
      version: {
        type: 'integer'
      }
    }
  };

  return rp({
    method: 'PUT',
    uri: url.parse(self.config.get('elasticsearch.url') + '/' +
                   self.config.get('kibana.index') + '/_mapping/template'),
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(mapping),
    timeout: 1000
  });
};


QueryEngine.prototype._loadTemplates =  function () {
  var self = this;
  // load default template examples
  var templatesToLoad = [
    'kibi-json-jade',
    'kibi-table-jade',
    'kibi-table-handlebars'
  ];

  _.each(templatesToLoad, function (templateId) {
    fs.readFile(path.join(__dirname, 'templates', templateId + '.json'), function (err, data) {
      if (err) {
        throw err;
      }
      var body = JSON.parse(data.toString());
      rp({
        method: 'POST',
        //op_type=create create templates documents only if they do not exist
        uri: url.parse(self.config.get('elasticsearch.url') + '/' +
                       self.config.get('kibana.index') + '/template/' +
                       templateId + '?op_type=create'
        ),
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body),
        timeout: 1000
      })
      .then(function (resp) {
        self.log.info('Template [' + templateId + '] successfully loaded');
      })
      .catch(function (err) {
        if (err.statusCode === 409) {
          self.log.warn('Template [' + templateId + '] already exists');
        }
      });
    });
  });
};

QueryEngine.prototype.setupJDBC = function () {
  if (this.config.get('kibi_core.load_jdbc') === true) {
    var JDBC = require('jdbc');
    var jinst = require('jdbc/lib/jinst');

    JdbcQuery  = require('./queries/jdbc_query');
    var JdbcHelper = require('./jdbc_helper');
    var jdbcHelper = new JdbcHelper(this.server);

    return jdbcHelper.prepareJdbcPaths().then(function (paths) {
      if (!jinst.isJvmCreated()) {
        // TODO: add new feature to pass java options as well
        // https://github.com/sirensolutions/kibi-private/issues/176
        // jinst.addOption("-Xrs");
        jinst.setupClasspath(paths.libs);
        return true;
      }
      return Promise.reject(new Error('Jvm not created'));
    });
  } else {
    return Promise.resolve(true);
  }
};

QueryEngine.prototype._fetchQueriesFromEs = function () {
  var self = this;
  return rp({
    method: 'GET',
    uri: url.parse(self.config.get('elasticsearch.url') + '/' + self.config.get('kibana.index') + '/query/_search'),
    qs: {
      size: 100
    },
    transform: function (resp) {
      var data = JSON.parse(resp);
      return data;
    }
  });
};

QueryEngine.prototype._getDatasourceFromEs = function (datasourceId) {
  var self = this;
  return rp({
    method: 'GET',
    uri: url.parse(self.config.get('elasticsearch.url') + '/' + self.config.get('kibana.index') + '/datasource/' +  datasourceId),
    transform: function (resp) {
      var data = JSON.parse(resp);
      if (data._source) {
        var o = data._source;
        o.id = data._id;
        return o;
      } else {
        throw new Error('datasource object for [' + datasourceId + '] has no _source field');
      }
    }
  });
};

QueryEngine.prototype.reloadQueries = function () {
  var self = this;
  return self._fetchQueriesFromEs()
  .then(function (resp) {

    var queryDefinitions = [];
    var datasourcesIds = [];
    if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
      _.each(resp.hits.hits, function (hit) {

        var queryDefinition = {
          id:                hit._id,
          label:             hit._source.title,
          description:       hit._source.description,
          activationQuery:   hit._source.st_activationQuery,
          resultQuery:       hit._source.st_resultQuery,
          datasourceId:      hit._source.st_datasourceId,
          rest_method:       hit._source.rest_method,
          rest_path:         hit._source.rest_path,
          rest_body:         hit._source.rest_body,
          rest_resp_restriction_path: hit._source.rest_resp_restriction_path,
          tags:              hit._source.st_tags
        };

        if (datasourcesIds.indexOf(hit._source.st_datasourceId) === -1) {
          datasourcesIds.push(hit._source.st_datasourceId);
        }
        // here we are querying the elastic search
        // and rest_params, rest_headers
        // comes back as strings
        try {
          queryDefinition.rest_params = JSON.parse(hit._source.rest_params);
        } catch (e) {
          queryDefinition.rest_params = [];
        }
        try {
          queryDefinition.rest_headers = JSON.parse(hit._source.rest_headers);
        } catch (e) {
          queryDefinition.rest_headers = [];
        }
        try {
          queryDefinition.rest_resp_status_code = parseInt(hit._source.rest_resp_status_code);
        } catch (e) {
          queryDefinition.rest_resp_status_code = 200;
        }
        try {
          queryDefinition.activation_rules = JSON.parse(hit._source.activation_rules);
        } catch (e) {
          queryDefinition.activation_rules = [];
        }


        queryDefinitions.push(queryDefinition);
      });
    }

    if (queryDefinitions.length > 0) {
      var promises = _.map(datasourcesIds, (datasourceId) => self._getDatasourceFromEs(datasourceId));
      return Promise.all(promises).then(function (datasources) {
        // now as we have all datasources
        // iterate over them and set the clazz
        _.each(datasources, (datasource) => setDatasourceClazz(self.server, datasource));

        self.queries = _(queryDefinitions).filter(function (queryDef) {
          //filter out queries for which datasources does not exists
          var datasource = _.find(datasources, (datasource) => datasource.id === queryDef.datasourceId);
          if (datasource) {
            queryDef.datasource = datasource;
            return true;
          }
          return false;
        }).map(function (queryDef) {
          // now once we have query definitions and datasources load queries
          if (queryDef.datasource.datasourceType === 'sparql_http') {
            return new SparqlQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === 'postgresql') {
            return new PostgresQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === 'mysql') {
            return new MysqlQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === 'sparql_jdbc' || queryDef.datasource.datasourceType === 'sql_jdbc') {
            if (self.config.get('kibi_core.load_jdbc') === false) {
              return new ErrorQuery(self.server, 'Please set the "load_jdbc" option to true in kibi.yml and restart the backend.');
            }
            return new JdbcQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === 'rest') {
            return new RestQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === 'sqlite') {
            return new SQLiteQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === 'tinkerpop3') {
            if (self.config.get('kibi_core.enterprise_enabled')) {
              return new TinkerPop3Query(self.server, queryDef, self.cache);
            }
          } else {
            logger.error('Unknown datasource type[' + queryDef.datasource.datasourceType + '] - could NOT create query object');
            return false;
          }
        }).value();
      });
    }
  }).catch(function (err) {
    self.log.error('Something is wrong - elastic search is not running');
    self.log.error(err);
  });
};


QueryEngine.prototype.clearCache =  function () {
  return this._init().then(() => {
    if (this.cache) {
      const promisedReset = Promise.method(this.cache.reset);
      return promisedReset().then(this.reloadQueries()).return('Cache cleared, Queries reloaded');
    }
    // here we are reloading queries no matter that cache is enabled or not
    return this.reloadQueries().return('The cache is disabled, Queries reloaded');
  });
};


/**
 * return a ordered list of query objects which:
 * a) do match the URI - this is implemented by executing the ASK query of each of the templates and checking which returns TRUE.
 * b) query label matches the names in queryIds (if provided)
 * Order is given by the priority value.
 */
QueryEngine.prototype._getQueries = function (queryIds, options) {
  var self = this;

  if (this.queries.length === 0) {
    return Promise.reject(
      new Error('There are no queries in memory. Create a new query or reload the existing ones from elastic search index')
    );
  }

  var errors = _(this.queries).filter(function (query) {
    return query instanceof ErrorQuery;
  }).map(function (err) {
    return err.getErrorMessage();
  }).value();
  if (errors && errors.length !== 0) {
    var msg = '';
    _.each(errors, function (err) {
      msg += err + '\n';
    });
    return Promise.reject(new Error(msg));
  }

  var all = !queryIds || (queryIds && queryIds.length === 1 && queryIds[0] === 'ALL');

  // if all === false
  // check that all requested queryIds exists and if not reject
  if (!all && queryIds) {
    for (var i = 0; i < queryIds.length; i++) {
      var id = queryIds[i];
      var exists = false;

      for (var j = 0; j < self.queries.length; j++) {
        if (id === self.queries[j].id) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        return Promise.reject(
          new Error('The query [' + id + '] requested by Kibi but not found in memory. ' +
                    'Possible reason - query datasource was removed. Please check the configuration')
        );
      }
    }
  }

  // here create an array of promises
  // filter by name
  var withRightId = _.filter(this.queries, function (query) {
    if (all) {
      return true;
    }
    return _.indexOf(queryIds, query.id) !== -1;
  });

  // here if after filtering by name we get zero results
  // it means that the requested query is not loaded in memory
  // reject with meaningful error
  if (withRightId.length === 0) {
    return Promise.reject(
      new Error('Non of requested queries ' + JSON.stringify(queryIds, null, ' ') + ' found in memory')
    );
  }
  var fromRightFolder = withRightId;

  var promises = _.map(fromRightFolder, function (query) {
    return query.checkIfItIsRelevant(options);
  });


  return Promise.all(promises).then(function (sparqlResponses) {
    // order the list prepare the list
    // go over responces and create an array on template objects for which ask queries returned true

    var filteredQueries = [];
    _.forEach(sparqlResponses, function (resp, i) {
      if (resp && resp.boolean === true) {
        filteredQueries.push(fromRightFolder[i]); // here important to use fromRightFolder !!!
      } else {
        filteredQueries.push(new InactivatedQuery(fromRightFolder[i].id));
      }
    });

    // order templates as they were ordered in queryIds array
    // but do it only if NOT special case ALL

    if (all) {
      return filteredQueries;
    } else {
      var  filteredSortedQueries = [];

      _.each(queryIds, function (id) {
        var found = _.find(filteredQueries, function (query) {
          return query.id === id;
        });
        if (found) {
          filteredSortedQueries.push(found);
        }
      });

      return filteredSortedQueries;
    }

  });
};

QueryEngine.prototype._getQueryDefById = function (queryDefs, queryId) {
  // here grab the corresponding queryDef
  return _.find(queryDefs, function (queryDef) {
    return queryDef.queryId === queryId;
  });
};


// Returns an array with response data from all relevant queries
// Use this method when you need just data and not query html
QueryEngine.prototype.getQueriesData = function (queryDefs, options) {
  var self = this;

  var queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(queryIds, options)
    .then(function (queries) {

      var promises = _.map(queries, function (query) {

        var queryDefinition = self._getQueryDefById(queryDefs, query.id);
        var queryVariableName = queryDefinition ? queryDefinition.queryVariableName : null;
        return query.fetchResults(options, null, queryVariableName);
      });
      return Promise.all(promises);
    });
  });
};

QueryEngine.prototype.getQueriesHtml = function (queryDefs, options) {
  var self = this;

  var queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });


  return self._init().then(function () {
    return self._getQueries(queryIds, options)
    .then(function (queries) {

      var promises = _.map(queries, function (query) {

        var queryDef = self._getQueryDefById(queryDefs, query.id);
        return query.getHtml(queryDef, options);

      });
      return Promise.all(promises);
    });
  });
};

/*
 * Executes given queries and returns only extracted ids
 * Use this method when you need just ids
 *
 * queryDefs is an array of object
 * queryDefs = [
 *     {
 *       queryId: ID,
 *       queryVariableName: VARIABLE_NAME // this property is required only if we want to extract ids
 *    },
 *    ...
 *  ]
 */
QueryEngine.prototype.getIdsFromQueries = function (queryDefs, options) {
  var self = this;

  var queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(queryIds, options)
    .then(function (queries) {
      var promises = _.map(queries, function (query) {
        var queryDefinition = self._getQueryDefById(queryDefs, query.id);
        var queryVariableName = queryDefinition ? queryDefinition.queryVariableName : null;
        return query.fetchResults(options, true, queryVariableName);
      });
      return Promise.all(promises);
    });
  });
};

module.exports = QueryEngine;


