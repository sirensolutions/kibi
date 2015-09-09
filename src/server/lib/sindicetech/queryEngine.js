var _           = require('lodash');
var fs          = require('fs');
var path        = require('path');
var Promise     = require('bluebird');
var rp          = require('request-promise');
var url         = require('url');
var LRU         = require('lru-cache');
var config      = require('../../config');
var logger      = require('../logger');
var waitForEs   = require('../waitForEs');
var SparqlQuery = require('./sparqlQuery');
var MysqlQuery  = require('./mysqlQuery');
var PostgresQuery  = require('./postgresQuery');
var SQLiteQuery = require('./sqliteQuery');
var RestQuery      = require('./restQuery');
var InactivatedQuery  = require('./inactivatedQuery');

var JdbcQuery;
var jdbcHelper;
var nodeJava;

if (config.kibana.datasources) {

  // require few things only if there is a jdbc datasource
  for (var datasourceId in config.kibana.datasources) {
    if (config.kibana.datasources.hasOwnProperty(datasourceId)) {
      var datasourceDef = config.kibana.datasources[datasourceId];
      if (datasourceDef.type === 'jdbc') {
        JdbcQuery  = require('./jdbcQuery');
        jdbcHelper = require('./jdbcHelper');
        var pathToSindicetechFolder = jdbcHelper.getRelativePathToSindicetechFolder();
        nodeJava   = require(pathToSindicetechFolder.replace(/\\/g, '/') + 'node_modules/jdbc-sindicetech/node_modules/java');
        break;
      }
    }
  }

  // prepare the java classpath before calling any other method
  if (nodeJava) {
    var paths = jdbcHelper.prepareJdbcPaths();
    _.each(paths.libpaths, function (path) {
      nodeJava.classpath.push(path);
    });
    _.each(paths.libs, function (path) {
      nodeJava.classpath.push(path);
    });
  }
}


function QueryEngine() {
  this.queries = [];
  this.initialized = false;
  this._init(config.kibana.datasource_enable_cache,
      config.kibana.datasource_cache_size,
      config.kibana.datasource_cache_max_age).then(function (data) {
    logger.info(data);
  });
}

QueryEngine.prototype._init = function (enableCache, cacheSize, cacheMaxAge) {
  // populate an array templatesDefinitions which contain templatesdefinition objects

  if (cacheSize === null || typeof cacheSize === 'undefined') {
    cacheSize = 500;
  }

  if (cacheMaxAge === null || typeof cacheMaxAge === 'undefined') {
    cacheMaxAge = 1000 * 60 * 60;
  }

  var self = this;
  if (self.initialized === true) {
    return Promise.resolve({'message': 'QueryEngine already initialized'});
  }

  self.cache = null;

  if (enableCache) {
    var defaultSettings = {
      max: cacheSize,
      maxAge: cacheMaxAge
    };
    var lruCache = LRU(defaultSettings);
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
        uri: url.parse(config.kibana.elasticsearch_url + '/' + config.kibana.kibana_index + '/template/' + templateId + '?op_type=create'),
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body),
        timeout: 1000
      })
      .then(function (resp) {
        logger.info('Template [' + templateId + '] successfully loaded');
      })
      .catch(function (err) {
        if (err.statusCode === 409) {
          logger.error('Template [' + templateId + '] already exists');
        }
      });
    });
  });

  return new Promise(function (fulfill, reject) {
    waitForEs().then(function () {

      self.reloadQueries().then(function () {
        self.initialized = true;
        fulfill({'message': 'QueryEngine initialization successfully done'});
      }).error(function (err) {
        reject(err);
      });

    }).error(function (err) {
      reject(err);
    });
  });
};

QueryEngine.prototype.reloadQueries = function () {
  var self = this;
  return self._fetchQueriesFromEs()
  .then(function (resp) {
    var queryDefinitions = [];
    if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
      _.each(resp.hits.hits, function (hit) {

        var queryDefinition = {
          id:                hit._id,
          label:             hit._source.title,
          description:       hit._source.description,
          activationQuery:   hit._source.st_activationQuery,
          resultQuery:       hit._source.st_resultQuery,
          datasourceId:      hit._source.st_datasourceId,
          tags:              hit._source.st_tags
        };

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

        queryDefinitions.push(queryDefinition);
      });
    }

    if (queryDefinitions.length > 0) {

      var queryDefinitionsFiltered  = _.filter(queryDefinitions, function (queryDef) {
        var datasource = config.kibana.datasources[queryDef.datasourceId];
        if (!datasource) {
          console.log(
            'Unknown datasourceId [' + queryDef.datasourceId + '] in query [' + queryDef.id + ']. ' +
            'Check your configuration file or review query object in queryEditor.');
          return false;
        }
        return true;
      });

      self.queries = _.map(queryDefinitionsFiltered, function (queryDef) {

        var datasource = config.kibana.datasources[queryDef.datasourceId];

        if (datasource.type === 'sparql') {
          return new SparqlQuery(queryDef, self.cache);
        } else if (datasource.type === 'pgsql') {
          return new PostgresQuery(queryDef, self.cache);
        } else if (datasource.type === 'mysql') {
          return new MysqlQuery(queryDef, self.cache);
        } else if (datasource.type === 'jdbc') {
          return new JdbcQuery(queryDef, self.cache);
        } else if (datasource.type === 'rest') {
          return new RestQuery(queryDef, self.cache);
        } else if (datasource.type === 'sqlite') {
          return new SQLiteQuery(queryDef, self.cache);
        } else {
          logger.error('Unknown endpointType[' + datasource.type + '] - could NOT create query object');
        }
      });
    }
  }).error(function (err) {
    logger.error('Something is wrong - elastic search is not running');
    logger.error(err);
  });
};

QueryEngine.prototype._fetchQueriesFromEs = function () {
  return rp({
    method: 'GET',
    uri: url.parse(config.kibana.elasticsearch_url + '/' + config.kibana.kibana_index + '/query/_search'),
    qs: {
      size: 100
    },
    transform: function (resp) {
      var data = JSON.parse(resp);
      return data;
    }
  });
};

/**
 * return a ordered list of query objects which:
 * a) do match the URI - this is implemented by executing the ASK query of each of the templates and checking which returns TRUE.
 * b) query label matches the names in queryIds (if provided)
 * Order is given by the priority value.
 */
QueryEngine.prototype._getQueries = function (uri, queryIds) {
  var that = this;

  if (this.queries.length === 0) {
    return Promise.reject(
      new Error('There are no queries in memory. Create a new query or reload the existing ones from elastic search index')
    );
  }

  var all = !queryIds || (queryIds && queryIds.length === 1 && queryIds[0] === 'ALL');

  // if all === false
  // check that all requested queryIds exists and if not reject
  if (!all && queryIds) {
    for (var i = 0; i < queryIds.length; i++) {
      var id = queryIds[i];
      var exists = false;

      for (var j = 0; j < that.queries.length; j++) {
        if (id === that.queries[j].id) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        return Promise.reject(
          new Error('The query [' + id + '] requested by KiBI kibana but not found in memory. Please check the configuration.')
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
    return query.checkIfItIsRelevant(uri);
  });


  return new Promise(function (fulfill, reject) {
    Promise.all(promises).then(function (sparqlResponses) {
        // order the list prepare the list
        // go over responces and create an array on template objects for which ask queries returned true

        var filteredQueries = [];
        _.forEach(sparqlResponses, function (resp, i) {
          if (resp && resp['boolean'] === true) {
            filteredQueries.push(fromRightFolder[i]); // here important to use fromRightFolder !!!
          } else {
            filteredQueries.push(new InactivatedQuery(fromRightFolder[i].id));
          }
        });

        // order templates as they were ordered in queryIds array
        // but do it only if NOT special case ALL

        if (all) {
          fulfill(filteredQueries);
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

          fulfill(filteredSortedQueries);
        }

      }).catch(function (err) {
        logger.error(err);
        reject(err);
      });
  });
};


QueryEngine.prototype._getQueryDefById = function (queryDefs, queryId) {
  // here grab the corresponding queryDef
  return _.find(queryDefs, function (queryDef) {
    return queryDef.queryId === queryId;
  });
};


QueryEngine.prototype._getOptionById = function (queryOptions, queryId) {
  // find the right option
  return _.find(queryOptions, function (option) {
    return option.queryId === queryId;
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
QueryEngine.prototype.getIdsFromQueries = function (uri, queryDefs) {
  var self = this;

  var queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(uri, queryIds)
    .then(function (queries) {
      var promises = _.map(queries, function (query) {
        var queryDefinition = self._getQueryDefById(queryDefs, query.id);
        var queryVariableName = queryDefinition ? queryDefinition.queryVariableName : null;
        return query.fetchResults(uri, true, queryVariableName);
      });
      return Promise.all(promises);
    });
  });
};

// Returns an array with response data from all relevant queries
// Use this method when you need just data and not query html
QueryEngine.prototype.getQueriesData = function (uri, queryDefs) {
  var self = this;

  var queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(uri, queryIds)
    .then(function (queries) {

      var promises = _.map(queries, function (query) {

        var queryDefinition = self._getQueryDefById(queryDefs, query.id);
        var queryVariableName = queryDefinition ? queryDefinition.queryVariableName : null;
        return query.fetchResults(uri, null, queryVariableName);
      });
      return Promise.all(promises);
    });
  });
};

QueryEngine.prototype.getQueriesHtml = function (uri, queryDefs) {
  var self = this;

  var queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(uri, queryIds)
    .then(function (queries) {

      var promises = _.map(queries, function (query) {

        var queryDef = self._getQueryDefById(queryDefs, query.id);
        return query.getHtml(uri, queryDef);

      });
      return Promise.all(promises);
    });
  });
};

QueryEngine.prototype.clearCache =  function () {
  var self = this;
  return self._init().then(function () {
    if (self.cache) {
      try {
        self.cache.reset();
        self.reloadQueries();
        return 'Cache cleared, Queries reloaded';
      } catch (err) {
        return err;
      }
    }
    // here we are reloading queries no matter that cache is enabled or not
    self.reloadQueries();
    return 'The cache is disabled, Queries reloaded';
  });
};

module.exports = new QueryEngine();
