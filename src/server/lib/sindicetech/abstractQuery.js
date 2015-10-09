var _ = require('lodash');
var crypto = require('crypto');
var Promise = require('bluebird');
var rp = require('request-promise');
var url = require('url');
var http = require('http');
var handlebars = require('handlebars');
var jade = require('jade');
var kibiUtils = require('kibiutils');
var slugifyId = require('./slugify_id');
var config = require('../../config');
var logger = require('../logger');
var queryHelper = require('./query_helper');
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

function Query(snippetDefinition, cache) {
  this.id = snippetDefinition.id;

  var config = {
    id                : snippetDefinition.id,
    label             : snippetDefinition.label || '',
    description       : snippetDefinition.description || '',
    activationQuery   : snippetDefinition.activationQuery || '',
    resultQuery       : snippetDefinition.resultQuery || '',
    datasourceId      : snippetDefinition.datasourceId || null,
    datasource        : snippetDefinition.datasource,
    rest_params       : snippetDefinition.rest_params || [],
    rest_headers      : snippetDefinition.rest_headers || [],
    rest_body         : snippetDefinition.rest_body || '',
    rest_path         : snippetDefinition.rest_path || '',
    rest_resp_status_code: snippetDefinition.rest_resp_status_code || 200,
    rest_resp_restriction_path: snippetDefinition.rest_resp_restriction_path || '$',

    tags              : snippetDefinition.tags || [],
    entityWeight      : snippetDefinition.entityWeight || 0.3,
    queryPrefixes     : snippetDefinition.queryPrefixes || {}
  };

  this.activationQueryRequireEntityURI = this._checkIfQueryRequireEntityURI(config.activationQuery);
  this.resultQueryRequireEntityURI = this._checkIfQueryRequireEntityURI(config.resultQuery);


  this.config = config;
  this.config.prefixesString = _.map(this.config.queryPrefixes, function (value, key) {
    return 'prefix ' + key + ': <' + value + '>';
  }).join('\n');

  this.cache = cache;
}

Query.prototype.generateCacheKey = function (prefix, query, onlyValues, valueVariableName) {
  var hash = crypto.createHash('sha256');
  _.each(arguments, function (arg) {
    hash.update(arg && String(arg) || '-');
  });
  return hash.digest('hex');
};

Query.prototype._checkIfQueryRequireEntityURI  = function (query) {
  return query.match(/@doc\[.+?]@/);
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


Query.prototype._getQueryFromConfig = function (query, uri) {
  if (!uri || uri.trim() === '' ) {
    return Promise.resolve(query);
  }

  var retQuery = query.replace(/\s{2,}/g, ' ');
  var parts = uri.trim().split('/');
  if (parts.length < 3) {
    Promise.reject('Malformed uri - should have at least 3 parts: index, type, id');
  }

  var index = parts[0];
  var type = parts[1];
  var id = parts[2];

  // TODO: add caching of documet

  return queryHelper.fetchDocument(index, type, id).then(function (doc) {
    //now parse the query and replace the placeholders
    return queryHelper.replaceVariablesInTheQuery(doc, retQuery);
  });
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

Query.prototype._fetchTemplate  = function (templateId) {
  var self = this;

  // here make sure to turn spaces into dashes
  templateId = slugifyId(templateId);

  if (self.cache) {
    var v =  self.cache.get(templateId);
    if (v) {
      return Promise.resolve(v);
    }
  }

  return rp({
    method: 'GET',
    uri: url.parse(config.kibana.elasticsearch_url + '/' + config.kibana.kibana_index + '/template/' + templateId + '/_source'),
    transform: function (resp) {
      var data = JSON.parse(resp);
      if (self.cache) {
        self.cache.set(templateId, data);
      }
      return data;
    }
  });
};


Query.prototype.getHtml = function (uri, option) {
  var that = this;

  return new Promise(function (fulfill, reject) {
    // first run fetch results
    that.fetchResults(uri, null, option.queryVariableName).then(function (data) {
      // here take the results and compile the result template


      var dataClone = _.clone(data, true);

      // here if there is a prefix replace it in values when they are uris
      // this does not go to the fetch results function because
      // the results from that function should not be modified in any way
      try {
        dataClone = that._postprocessResults(dataClone);
      } catch (e) {
        logger.error(e);
      }
      // here unique id
      dataClone.id = kibiUtils.getUuid4();

      // make sure that only picked not sensitive values goes in config
      // as it will be visible on the frontend
      var safeConfig = {};
      safeConfig.id = that.id;
      safeConfig.templateVars = option.templateVars;
      safeConfig.open = option.open;
      safeConfig.showFilterButton = option.showFilterButton;
      safeConfig.redirectToDashbord = option.redirectToDashbord;
      // now override the oryginal config
      dataClone.config = safeConfig;

      // here fetch template via $http and cache it
      that._fetchTemplate(option.templateId)
      .then(function (template) {

        var templateSource = template.st_templateSource;
        var templateEngine = template.st_templateEngine;

        if (templateSource) {

          var html = 'Could not compile the template into html';

          if (templateEngine === 'handlebars') {

            var hbTemplate = handlebars.compile(templateSource);
            html = hbTemplate(dataClone);

          } else if (templateEngine === 'jade') {

            var jadeFn = jade.compile(templateSource);
            html = jadeFn(dataClone);

          } else {

            html = 'Unsupported template engine. Try handlebars or jade';

          }

          fulfill({
            queryActivated: true,
            data: dataClone,
            html: html
          });

        } else {
          reject('unknown template source');
        }

      }).catch(function (err) {
        // here DO NOT reject
        // as we want to still show the json data even if
        // template compiled with errors
        logger.error(err);
        fulfill({
          error: err.message,
          data: dataClone
        });

      });

    }).catch(function (err) {
      reject(err);
    });
  });
};


// return a promise which when resolved should return
// a following response object
// {
//    "boolean": true/false
// }
Query.prototype.checkIfItIsRelevant = function (uri, datasource) {
  throw 'Must be implemented by subclass';
};


Query.prototype._extractIds = function (data) {
  throw 'Must be implemented by subclass';
};

Query.prototype.fetchResults = function (uri, onlyIds, idVariableName) {
  throw 'Must be implemented by subclass';
};

Query.prototype._postprocessResults = function (data) {
  throw 'Must be implemented by subclass';
};


module.exports = Query;
