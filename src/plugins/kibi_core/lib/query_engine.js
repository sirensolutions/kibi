const  Symbols = require('./_symbols');
const  kibiUtils = require('kibiutils');
const  rp = require('request-promise');
const  Promise = require('bluebird');
const  _ = require('lodash');
const  fs = require('fs');
const  path = require('path');
const  lru = require('lru-cache');
const  url = require('url');
const  logger = require('./logger');
const  setDatasourceClazz = require('./datasources/set_datasource_clazz');
const  SparqlQuery = require('./queries/sparql_query');
const  MysqlQuery = require('./queries/mysql_query');
const  PostgresQuery = require('./queries/postgres_query');
const  SQLiteQuery = require('./queries/sqlite_query');
const  RestQuery = require('./queries/rest_query');
const  ErrorQuery = require('./queries/error_query');
const  InactivatedQuery = require('./queries/inactivated_query');
const  MissingSelectedDocumentQuery = require('./queries/missing_selected_document_query');
let JdbcQuery;

function QueryEngine(server) {
  this.server = server;
  this.config = server.config();
  const sslCA = this.config.get('kibi_core.gremlin_server.ssl.ca');
  if (sslCA) {
    this.sslCA = fs.readFileSync(sslCA);
  }
  this.queries = [];
  this.initialized = false;
  this.log = logger(server, 'query_engine');
  this.client = server.plugins.elasticsearch.client;
}

QueryEngine.prototype._onStatusGreen = function () {
  return this.loadPredefinedData().then(() => {
    return this.setupJDBC().then(() => {
      return this.reloadQueries().then(() => {
        this.initialized = true;
        return true;
      });
    });
  });
};

QueryEngine.prototype._init = function (cacheSize = 500, enableCache = true, cacheMaxAge = 1000 * 60 * 60) {
  const self = this;

  if (self.initialized === true) {
    return Promise.resolve({
      message: 'QueryEngine already initialized'
    });
  }

  self.cache = null;

  if (enableCache) {
    const defaultSettings = {
      max: cacheSize,
      maxAge: cacheMaxAge
    };
    const lruCache = lru(defaultSettings);
    const cache = {
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
    const succesfullInitializationMsg = { message: 'QueryEngine initialized successfully.' };
    const elasticsearchStatus = _.get(self, 'server.plugins.elasticsearch.status');
    if (elasticsearchStatus && elasticsearchStatus.state === 'green') {
      // already green - fire the _onStatusGreen
      self._onStatusGreen().then(function () {
        fulfill(succesfullInitializationMsg);
      }).catch(reject);
    } else {
      // not ready yet - bind _onStatusGreen to change event so it will fire immediatelly when it becomes green
      elasticsearchStatus.on('change', function () {
        // fire the _onStatusGreen only when elasticsearch status is green
        if (self.server.plugins.elasticsearch.status.state === 'green') {
          self._onStatusGreen().then(function () {
            fulfill(succesfullInitializationMsg);
          }).catch(reject);
        }
      });
    }
  });
};

QueryEngine.prototype.loadPredefinedData = function () {
  const self = this;
  return new Promise(function (fulfill, reject) {

    const tryToLoad = function () {
      self._isKibiIndexPresent().then(function () {
        self._loadTemplatesMapping().then(function () {
          self._loadTemplates().then(function () {
            if (self.config.get('pkg.kibiEnterpriseEnabled')) {
              return self._loadDatasources().then(function () {
                return self._loadQueries().then(function () {
                  return self._refreshKibiIndex().then(function () {
                    fulfill(true);
                  });
                });
              });
            } else {
              fulfill(true);
            }
          }).catch(reject);
        }).catch(reject);
      }).catch(function (err) {
        self.log.warn('Could not retrieve Kibi index: ' + err);
        setTimeout(tryToLoad.bind(self), 500);
      });
    };

    tryToLoad();
  });
};

QueryEngine.prototype._isKibiIndexPresent = function () {
  const self = this;
  return self.client.cat.indices({
    index: self.config.get('kibana.index'),
    timeout: '2000ms'
  })
  .then(function (kibiIndex) {
    const exists = !!kibiIndex;
    if (exists) {
      self.log.info('Found kibi index: [' + self.config.get('kibana.index') + ']');
    }
    return exists || Promise.reject(new Error('Kibi index: [' + self.config.get('kibana.index') + '] does not exists'));
  });
};

QueryEngine.prototype._refreshKibiIndex = function () {
  const self = this;
  return self.client.indices.refresh({
    index: self.config.get('kibana.index'),
    force: true
  });
};

QueryEngine.prototype.gremlin = function (datasourceParams, options) {
  // TODO: remove when https://github.com/sirensolutions/kibi-internal/issues/906 is fixed
  const parsedTimeout = parseInt(datasourceParams.timeout);
  if (isNaN(parsedTimeout)) {
    return Promise.reject({
      error: 'Invalid timeout',
      message: 'Invalid timeout: ' + datasourceParams.timeout
    });
  }

  const gremlinOptions = {
    method: options.method | 'GET',
    uri: datasourceParams.url,
    timeout: parsedTimeout
  };

  if (this.sslCA) {
    gremlinOptions.ca = this.sslCA;
  }

  _.assign(gremlinOptions, options);
  if (gremlinOptions.data) {
    gremlinOptions.data.credentials = datasourceParams.credentials;
  }
  if (gremlinOptions.json) {
    gremlinOptions.json.credentials = datasourceParams.credentials;
  }

  return rp(gremlinOptions);
};

QueryEngine.prototype.gremlinPing = function (baseGraphAPIUrl) {
  const options = {
    method: 'GET',
    uri: baseGraphAPIUrl + '/ping',
    timeout: 5000
  };

  if (this.sslCA) {
    options.ca = this.sslCA;
  }
  return rp(options);
};

/**
 * Loads templates mapping.
 *
 * @return {Promise}
 */
QueryEngine.prototype._loadTemplatesMapping = function () {
  const mapping = {
    template: {
      properties: {
        version: {
          type: 'integer'
        }
      }
    }
  };

  return this.client.indices.putMapping({
    timeout: '1000ms',
    index: this.config.get('kibana.index'),
    type: 'template',
    body: mapping
  });
};

/**
 * Loads default templates.
 *
 * @return {Promise.<*>}
 */
QueryEngine.prototype._loadTemplates = function () {
  const self = this;

  const templatesToLoad = [
    'kibi-json-jade',
    'kibi-table-jade',
    'kibi-html-angular',
    'kibi-table-handlebars'
  ];

  self.log.info('Loading templates');

  return Promise.all(templatesToLoad.map((templateId) => {
    return fs.readFile(path.join(__dirname, 'templates', templateId + '.json'), function (err, data) {
      if (err) {
        throw err;
      }
      return self.client.create({
        timeout: '1000ms',
        index: self.config.get('kibana.index'),
        type: 'template',
        id: templateId,
        body: data.toString()
      })
      .then(() => {
        self.log.info('Template [' + templateId + '] successfully loaded');
      })
      .catch((err) => {
        if (err.statusCode === 409) {
          self.log.warn('Template [' + templateId + '] already exists');
        } else {
          self.log.error('Could not load template [' + templateId + ']', err);
        }
      });
    });
  }));
};

QueryEngine.prototype._loadDatasources = function () {
  const self = this;
  // load default datasource examples
  const datasourcesToLoad = [
    'Kibi-Gremlin-Server'
  ];

  self.log.info('Loading datasources');

  const promises = [];
  _.each(datasourcesToLoad, function (datasourceId) {
    promises.push(new Promise(function (fulfill, reject) {

      fs.readFile(path.join(__dirname, 'datasources', datasourceId + '.json'), function (err, data) {
        if (err) {
          reject(err);
          return;
        }
        // check whether HTTP or HTTPS is used
        if (self.config.has('kibi_core.gremlin_server.url')) {
          const gremlinUrl = self.config.get('kibi_core.gremlin_server.url');
          const datasourceObj = JSON.parse(data.toString());
          const datasourceObjParam = JSON.parse(datasourceObj.datasourceParams);

          datasourceObjParam.url = gremlinUrl + '/graph/queryBatch';
          datasourceObj.datasourceParams = JSON.stringify(datasourceObjParam);

          data = new Buffer(JSON.stringify(datasourceObj).length);
          data.write(JSON.stringify(datasourceObj), 'utf-8');
        }
        self.client.index({
          timeout: '1000ms',
          index: self.config.get('kibana.index'),
          type: 'datasource',
          id: datasourceId,
          body: data.toString()
        })
        .then(function (resp) {
          self.log.info('Datasource [' + datasourceId + '] successfully loaded');
          fulfill(true);
        })
        .catch(function (err) {
          self.log.error('Could not load datasource [' + datasourceId + ']', err);
          fulfill(true);
        });
      });
    }));
  });

  return Promise.all(promises);
};

QueryEngine.prototype._loadQueries = function () {
  const self = this;
  // load default query examples
  const queriesToLoad = [];

  self.log.info('Loading queries');

  return Promise.map(queriesToLoad, function (queryId) {
    return new Promise(function (fulfill, reject) {
      fs.readFile(path.join(__dirname, 'queries', queryId + '.json'), function (err, data) {
        if (err) {
          reject(err);
          return;
        }
        self.client.create({
          timeout: '1000ms',
          index: self.config.get('kibana.index'),
          type: 'query',
          id: queryId,
          body: data.toString()
        })
        .then(function (resp) {
          self.log.info('Query [' + queryId + '] successfully loaded');
          fulfill(true);
        })
        .catch(function (err) {
          if (err.statusCode === 409) {
            self.log.warn('Query [' + queryId + '] already exists');
          } else {
            self.log.error('Could not load query [' + queryId + ']', err);
          }
          fulfill(true);
        });
      });
    });
  });
};

QueryEngine.prototype.setupJDBC = function () {
  if (this.config.get('kibi_core.load_jdbc') === true) {
    const JDBC = require('jdbc');
    const jinst = require('jdbc/lib/jinst');

    JdbcQuery  = require('./queries/jdbc_query');
    const JdbcHelper = require('./jdbc_helper');
    const jdbcHelper = new JdbcHelper(this.server);

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
  const self = this;
  return self.client.search({
    index: self.config.get('kibana.index'),
    type: 'query',
    size: 100
  });
};

QueryEngine.prototype._getDatasourceFromEs = function (datasourceId) {
  const self = this;
  return self.client.search({
    index: self.config.get('kibana.index'),
    type: 'datasource',
    q: '_id:' + datasourceId
  }).then(function (result) {
    const datasource = result.hits.hits[0];
    if (!datasource) {
      return Promise.reject(new Error(`Datasource with id ${datasourceId} was not found.`));
    }
    datasource._source.id = datasource._id;
    return datasource._source;
  });
};

QueryEngine.prototype.reloadQueries = function () {
  const self = this;
  return self._fetchQueriesFromEs()
  .then(function (resp) {

    const queryDefinitions = [];
    const datasourcesIds = [];
    if (resp.hits && resp.hits.hits && resp.hits.hits.length > 0) {
      self.log.info('Reloading ' + resp.hits.hits.length + ' queries into memory:');
      _.each(resp.hits.hits, function (hit) {
        self.log.info('Reloading [' + hit._id + ']');
        const queryDefinition = {
          id:                hit._id,
          label:             hit._source.title,
          description:       hit._source.description,
          activationQuery:   hit._source.activationQuery,
          resultQuery:       hit._source.resultQuery,
          datasourceId:      hit._source.datasourceId,
          rest_method:       hit._source.rest_method,
          rest_path:         hit._source.rest_path,
          rest_body:         hit._source.rest_body,
          tags:              hit._source.tags
        };

        if (datasourcesIds.indexOf(hit._source.datasourceId) === -1) {
          datasourcesIds.push(hit._source.datasourceId);
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
          queryDefinition.rest_variables = JSON.parse(hit._source.rest_variables);
        } catch (e) {
          queryDefinition.rest_variables = [];
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
      return self.client.search({
        index: self.config.get('kibana.index'),
        type: 'datasource',
        size: 100
      })
      .then(function (datasources) {
        // now as we have all datasources
        // iterate over them and set the clazz
        for (let i = 0; i < datasources.hits.total; i++) {
          const hit = datasources.hits.hits[i];
          if (datasourcesIds.indexOf(hit._id) !== -1) {
            setDatasourceClazz(self.server, hit._source);
          }
        }

        self.queries = _(queryDefinitions).filter(function (queryDef) {
          //filter out queries for which datasources does not exists
          const datasource = _.find(datasources.hits.hits, (datasource) => datasource._id === queryDef.datasourceId);
          if (datasource) {
            datasource._source.id = datasource._id;
            queryDef.datasource = datasource._source;
            return true;
          }
          self.log.error('Query [' + queryDef.id + '] not loaded because datasource [' + queryDef.datasourceId + '] not found');
          return false;
        }).map(function (queryDef) {
          // now once we have query definitions and datasources load queries
          if (queryDef.datasource.datasourceType === kibiUtils.DatasourceTypes.sparql_http) {
            return new SparqlQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === kibiUtils.DatasourceTypes.postgresql) {
            return new PostgresQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === kibiUtils.DatasourceTypes.mysql) {
            return new MysqlQuery(self.server, queryDef, self.cache);
          } else if (kibiUtils.isJDBC(queryDef.datasource.datasourceType)) {
            if (self.config.get('kibi_core.load_jdbc') === false) {
              const msg = 'Please set the "kibi_core.load_jdbc" option to true in kibi.yml and restart the backend.';
              return new ErrorQuery(self.server, msg);
            }
            return new JdbcQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === kibiUtils.DatasourceTypes.rest) {
            return new RestQuery(self.server, queryDef, self.cache);
          } else if (queryDef.datasource.datasourceType === kibiUtils.DatasourceTypes.sqlite) {
            return new SQLiteQuery(self.server, queryDef, self.cache);
          } else {
            self.log.error('Unknown datasource type [' + queryDef.datasource.datasourceType + '] - could NOT create query object');
            return false;
          }
        }).value();
      });
    }
  }).catch(function (err) {
    self.log.error('Something is wrong - elasticsearch is not running');
    self.log.error(err);
  });
};

QueryEngine.prototype.clearCache =  function () {
  return this._init().then(() => {
    if (this.cache) {
      const promisedReset = Promise.method(this.cache.reset);
      return promisedReset()
      .then(() => this.reloadQueries())
      .then(() => 'Cache cleared, Queries reloaded');
    }
    // here we are reloading queries no matter that cache is enabled or not
    return this.reloadQueries()
    .then(() => 'The cache is disabled, Queries reloaded');
  });
};

/**
 * return a ordered list of query objects which:
 * a) do match the URI - this is implemented by executing the ASK query of each of the templates and checking which returns TRUE.
 * b) query label matches the names in queryIds (if provided)
 * Order is given by the priority value.
 */
QueryEngine.prototype._getQueries = function (queryIds, options) {
  const self = this;

  if (this.queries.length === 0) {
    return Promise.reject(
      new Error('There are no queries in memory. Create a new query or reload the existing ones from elastic search index')
    );
  }

  const errors = _(this.queries).filter(function (query) {
    return query instanceof ErrorQuery;
  }).map(function (err) {
    return err.getErrorMessage();
  }).value();
  if (errors && errors.length !== 0) {
    let msg = '';
    _.each(errors, function (err) {
      msg += err + '\n';
    });
    return Promise.reject(new Error(msg));
  }

  const all = !queryIds || (queryIds && queryIds.length === 1 && queryIds[0] === 'ALL');

  // if all === false
  // check that all requested queryIds exists and if not reject
  if (!all && queryIds) {
    for (let i = 0; i < queryIds.length; i++) {
      const id = queryIds[i];
      let exists = false;

      for (let j = 0; j < self.queries.length; j++) {
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
  const withRightId = _.filter(this.queries, function (query) {
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
  const fromRightFolder = withRightId;

  const promises = _.map(fromRightFolder, function (query) {
    return query.checkIfItIsRelevant(options);
  });

  return Promise.all(promises).then(function (queryResponses) {
    // order the list prepare the list
    // go over responces and create an array on template objects for which ask queries returned true

    const filteredQueries = _.map(queryResponses, function (resp, i) {
      switch (resp) {
        case Symbols.QUERY_RELEVANT:
          return fromRightFolder[i]; // here important to use fromRightFolder !!!
        case Symbols.QUERY_DEACTIVATED:
          return new InactivatedQuery(self.server, fromRightFolder[i].id);
        case Symbols.SELECTED_DOCUMENT_NEEDED:
          return new MissingSelectedDocumentQuery(fromRightFolder[i].id);
      }
    });

    // order templates as they were ordered in queryIds array
    // but do it only if NOT special case ALL

    if (all) {
      return filteredQueries;
    } else {
      const  filteredSortedQueries = [];

      _.each(queryIds, function (id) {
        const found = _.find(filteredQueries, function (query) {
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
  const self = this;

  const queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(queryIds, options)
    .then(function (queries) {

      const promises = _.map(queries, function (query) {

        const queryDefinition = self._getQueryDefById(queryDefs, query.id);
        const queryVariableName = queryDefinition ? queryDefinition.queryVariableName : null;
        return query.fetchResults(options, null, queryVariableName);
      });
      return Promise.all(promises);
    });
  });
};

QueryEngine.prototype.getQueriesHtml = function (queryDefs, options) {
  const self = this;

  const queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });


  return self._init().then(function () {
    return self._getQueries(queryIds, options)
    .then(function (queries) {

      const promises = _.map(queries, function (query) {

        const queryDef = self._getQueryDefById(queryDefs, query.id);
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
  const self = this;

  const queryIds = _.map(queryDefs, function (queryDef) {
    return queryDef.queryId;
  });

  return self._init().then(function () {
    return self._getQueries(queryIds, options)
    .then(function (queries) {
      const promises = _.map(queries, function (query) {
        const queryDefinition = self._getQueryDefById(queryDefs, query.id);
        const queryVariableName = queryDefinition ? queryDefinition.queryVariableName : null;
        return query.fetchResults(options, true, queryVariableName);
      });
      return Promise.all(promises);
    });
  });
};

module.exports = QueryEngine;
