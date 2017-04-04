var _ = require('lodash');
var crypto = require('crypto');
var Promise = require('bluebird');
var url = require('url');
var http = require('http');
var handlebars = require('handlebars');
var jade = require('jade');
var kibiUtils = require('kibiutils');
var debug = false;

handlebars.registerHelper('json', function (context) {
  return JSON.stringify(context);
});

handlebars.registerHelper('getVariableValue', function (binding, name, type, options) {
  if (binding[name] && type === binding[name].type) {
    return options.fn(binding[name]);
  } else {
    return options.inverse(binding[name]);
  }
});

function Query(server, snippetDefinition, cache) {
  this.server = server;
  this.serverConfig = server.config();
  this.log = require('../logger')(server, 'abstract_query');
  this.client = server.plugins.elasticsearch.client;

  this.id = snippetDefinition.id;

  var config = {
    id: snippetDefinition.id,
    label: snippetDefinition.label || '',
    description: snippetDefinition.description || '',
    activationQuery: snippetDefinition.activationQuery || '',
    resultQuery: snippetDefinition.resultQuery || '',
    datasourceId: snippetDefinition.datasourceId || null,
    datasource: snippetDefinition.datasource,
    rest_params: snippetDefinition.rest_params || [],
    rest_headers: snippetDefinition.rest_headers || [],
    rest_variables: snippetDefinition.rest_variables || [],
    rest_body: snippetDefinition.rest_body || '',
    rest_method: snippetDefinition.rest_method || 'GET',
    rest_path: snippetDefinition.rest_path || '',
    rest_resp_status_code: snippetDefinition.rest_resp_status_code || 200,
    activation_rules: snippetDefinition.activation_rules || [],
    tags: snippetDefinition.tags || [],
    entityWeight: snippetDefinition.entityWeight || 0.3,
    queryPrefixes: snippetDefinition.queryPrefixes || {}
  };

  this.config = config;
  this.config.prefixesString = _.map(this.config.queryPrefixes, function (value, key) {
    return 'prefix ' + key + ': <' + value + '>';
  }).join('\n');

  this.cache = cache;
}

Query.prototype._getUsername = function (options) {
  if (options && options.credentials && options.credentials.username) {
    return options.credentials.username;
  }
  return null;
};

Query.prototype.generateCacheKey = function (prefix, query, onlyValues, valueVariableName, username) {
  var hash = crypto.createHash('sha256');
  _.each(arguments, function (arg) {
    hash.update(arg && String(arg) || '-');
  });
  return hash.digest('hex');
};

Query.prototype._checkIfSelectedDocumentRequiredAndNotPresent = function (options) {
  const isEntityDependent = kibiUtils.doesQueryDependOnEntity([ this.config ]);

  return isEntityDependent &&
    (!options || !options.selectedDocuments || options.selectedDocuments.length === 0 || !options.selectedDocuments[0]);
};


Query.prototype._extractIdsFromSql = function (rows, idVariableName) {
  var ids = [];

  var dot = idVariableName.indexOf('.');
  if (dot !== -1) {
    idVariableName = idVariableName.substring(dot + 1);
  }
  _.each(rows, function (row) {
    if (row[idVariableName]) {
      ids.push(row[idVariableName]);
    } else if (row[idVariableName.toUpperCase()]) {
      ids.push(row[idVariableName.toUpperCase()]);
    } else if (row[idVariableName.toLowerCase()]) {
      ids.push(row[idVariableName.toLowerCase()]);
    }
  });
  return _.uniq(ids);
};


Query.prototype._returnAnEmptyQueryResultsPromise = function (message) {
  var self = this;
  var data = {
    head: {
      vars: []
    },
    config: {
      label: self.config.label,
      esFieldName: self.config.esFieldName
    },
    ids: [],
    results: {
      bindings: []
    },
    warning: message
  };
  return Promise.resolve(data);
};

Query.prototype._fetchTemplate = function (templateId) {
  var self = this;

  // here make sure to turn spaces into dashes
  templateId = kibiUtils.slugifyId(templateId);

  if (self.cache) {
    var v =  self.cache.get(templateId);
    if (v) {
      return Promise.resolve(v);
    }
  }

  return self.client.search({
    index: self.serverConfig.get('kibana.index'),
    type: 'template',
    q: '_id:' + templateId
  }).then(function (result) {
    const template = result.hits.hits[0];
    if (self.cache) {
      self.cache.set(templateId, template._source);
    }
    return template._source;
  });
};

Query.prototype.getHtml = function (queryDef, options) {
  var that = this;

  // first run fetch results
  return that.fetchResults(options, null, queryDef.queryVariableName).then(function (data) {
    // here take the results and compile the result template

    // here if there is a prefix replace it in values when they are uris
    // this does not go to the fetch results function because
    // the results from that function should not be modified in any way
    try {
      data = that._postprocessResults(data);
    } catch (e) {
      that.log.error(e);
    }
    // here unique id
    data.id = kibiUtils.getUuid4();

    // make sure that only picked not sensitive values goes in config
    // as it will be visible on the frontend
    var safeConfig = {};
    safeConfig.id = that.id;
    safeConfig.templateVars = queryDef.templateVars;
    safeConfig.open = queryDef.open;
    // now override the original config
    data.config = safeConfig;

    var templateId = queryDef.templateId || 'kibi-json-jade';
    // here fetch template via $http and cache it
    return that._fetchTemplate(templateId)
    .then(function (template) {

      if (template.templateSource) {
        var html = 'Could not compile the template into html';
        if (template.templateEngine === 'handlebars') {
          var hbTemplate = handlebars.compile(template.templateSource);
          html = hbTemplate(data);
        } else if (template.templateEngine === 'jade') {
          var jadeFn = jade.compile(template.templateSource, { compileDebug: true, filename: templateId });
          html = jadeFn(data);
        } else {
          html = 'Unsupported template engine. Try handlebars or jade';
        }

        return Promise.resolve({
          queryActivated: true,
          data: data,
          html: html
        });

      } else {
        return Promise.reject('unknown template source');
      }

    }).catch(function (err) {
      // here DO NOT reject
      // as we want to still show the json data even if
      // template compiled with errors
      that.log.error(err);
      return Promise.resolve({
        error: err,
        data: data
      });
    });
  })
  .catch(err => {
    // do not reject so that data from other successful queries can be displayed
    that.log.error(err);
    return Promise.resolve({
      error: err,
      data: {
        config: {
          id: that.id
        }
      }
    });
  });
};

/**
 * Return a promise which when resolved should return true or false
 */
Query.prototype.checkIfItIsRelevant = function (options) {
  throw 'Must be implemented by subclass';
};

Query.prototype._extractIds = function (data) {
  throw 'Must be implemented by subclass';
};

Query.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  throw 'Must be implemented by subclass';
};

Query.prototype._postprocessResults = function (data) {
  throw 'Must be implemented by subclass';
};


module.exports = Query;
