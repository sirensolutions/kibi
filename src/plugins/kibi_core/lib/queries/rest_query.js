var _ = require('lodash');
var Promise = require('bluebird');
var url = require('url');
var rp = require('request-promise');
var jsonpath = require('jsonpath');
var AbstractQuery = require('./abstract_query');
var QueryHelper = require('../query_helper');
var RulesHelper = require('../rules_helper');

function RestQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.logger = require('../logger')(server, 'rest_query');
  this.queryHelper = new QueryHelper(server);
  this.rulesHelper = new RulesHelper(server);
}

RestQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': RestQuery
});


/*
 * Return a promise which when resolved should return true or false.
 */
RestQuery.prototype.checkIfItIsRelevant = function (options) {
  if (this._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    this.logger.warn('No elasticsearch document selected while required by the REST query. [' + this.config.id + ']');
    return Promise.resolve(false);
  }

  // no document selected there is nothing to check against
  if (!options.selectedDocuments || options.selectedDocuments.length === 0) {
    return Promise.resolve(true);
  }

  // empty rules - let it go
  if (this.config.activation_rules.length === 0) {
    return Promise.resolve(true);
  }

  // evaluate the rules
  return this.rulesHelper.evaluate(this.config.activation_rules, options.selectedDocuments, options.credentials);
};


RestQuery.prototype._logFailedRequestDetails = function (msg, originalError, resp) {
  this.logger.error(msg, originalError);
  this.logger.error('See the full resp object below');
  this.logger.error(resp);
};

RestQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var self = this;

  // currently we use only single selected document
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var urlS = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var username = this.config.datasource.datasourceClazz.datasource.datasourceParams.username;
  var password = this.config.datasource.datasourceClazz.datasource.datasourceParams.password;
  var cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return new Promise(function (fulfill, reject) {
    var start = new Date().getTime();
    var regex = /^GET|POST$/;

    if (!regex.test(self.config.rest_method)) {
      reject(new Error('Only GET|POST methods are supported at the moment'));
      return;
    }

    if (!(self.config.rest_params instanceof Array)) {
      reject(new Error('rest_params should be an Array. Check the elasticsearch mapping'));
      return;
    }

    if (!(self.config.rest_headers instanceof Array)) {
      reject(new Error('rest_headers should be an Array. Check the elasticsearch mapping'));
      return;
    }

    // user can also use a special variables like $auth_token
    var availableVariables = {
      // for now we support only auth_token username password
      // so user can provide any of these in params, headers, or body
      '${auth_token}': self.config.datasource.datasourceClazz.populateParameters('${auth_token}'),
      '${username}': self.config.datasource.datasourceClazz.populateParameters('${username}'),
      '${password}': self.config.datasource.datasourceClazz.populateParameters('${password}')
    };

    // get all params from datasource and merge them with the one from the query
    const mergedHeaders = [];
    const mergedParams = [];
    if (self.config.rest_headers) {
      _.each(self.config.rest_headers, header => {
        const found = _.find(mergedHeaders, h => h.name === header.name);
        if (!found) {
          mergedHeaders.push(header);
        }
      });
    }
    if (_.get(self.config, 'datasource.datasourceParams.headers')) {
      _.each(self.config.datasource.datasourceParams.headers, header => {
        const found = _.find(mergedHeaders, h => h.name === header.name);
        if (!found) {
          mergedHeaders.push(header);
        }
      });
    }

    if (self.config.rest_params) {
      _.each(self.config.rest_params, param => {
        const found = _.find(mergedParams, p => p.name === param.name);
        if (!found) {
          mergedParams.push(param);
        }
      });
    }
    if (_.get(self.config, 'datasource.datasourceParams.params')) {
      _.each(self.config.datasource.datasourceParams.params, param => {
        const found = _.find(mergedParams, p => p.name === param.name);
        if (!found) {
          mergedParams.push(param);
        }
      });
    }

    // the whole replacement of values is happening here
    self.queryHelper.replaceVariablesForREST(
      mergedHeaders,
      mergedParams,
      self.config.rest_body,
      self.config.rest_path,
      uri, availableVariables,
      options.credentials)
    .then(function (results) {
      // here convert the params and headers from array to map
      var headers = _.zipObject(_.pluck(results.headers, 'name'), _.pluck(results.headers, 'value'));
      var params = _.zipObject(_.pluck(results.params, 'name'), _.pluck(results.params, 'value'));
      var body = results.body;
      var path = results.path;

      var key;
      if (self.cache && cacheEnabled) {
        key = self.generateCacheKey(
          self.config.rest_method,
          urlS,
          path,
          JSON.stringify(headers),
          JSON.stringify(params),
          body,
          self._getUsername(options));
        var v = self.cache.get(key);
        if (v) {
          return fulfill(v);
        }
      }

      // to check any option visit
      // https://github.com/request/request#requestoptions-callback
      var rpOptions = {
        method: self.config.rest_method,
        uri: url.parse(url.resolve(urlS, path)),
        headers: headers,
        timeout: timeout || 5000,
        transform: function (body, resp) {
          var msg;
          var data = {
            results: {}
          };
          if (resp.statusCode !== self.config.rest_resp_status_code) {
            msg = 'Invalid response status code: [' + resp.statusCode + '] Expected: [' + self.config.rest_resp_status_code + ']';
            self._logFailedRequestDetails(msg, null, resp);
            throw new Error(msg);
          }

          // TODO: / Kibi / change this once we support xml resp or text resp
          var json;
          try {
            json = JSON.parse(body);
          } catch (e) {
            msg = 'Error while parsing body as JSON. Details: ' + e.message;
            self._logFailedRequestDetails(msg, e, resp);
            throw new Error(msg);
          }

          data.results = json;

          if (idVariableName && self.config.rest_variables) {
            var o = _.find(self.config.rest_variables, function (v) {
              return v.name === idVariableName;
            });

            if (o) {
              try {
                data.ids = jsonpath.query(json, o.value);
              } catch (e) {
                msg = 'Error while executing the JSONPath expressionXX. Details: ' + e.message;
                self._logFailedRequestDetails(msg, e, resp);
                throw new Error(msg);
              }
            }
          }

          if (self.cache && cacheEnabled) {
            self.cache.set(key, data, maxAge);
          }
          return data;
        }
      };

      if (username && password) {
        rpOptions.auth = {
          // as they might be encrypted make sure to call populateParameters
          username: self.config.datasource.datasourceClazz.populateParameters('${username}'),
          password: self.config.datasource.datasourceClazz.populateParameters('${password}'),
          sendImmediately: false
        };
      }

      if (self.config.rest_method === 'GET') {
        rpOptions.qs = params;
      } else if (self.config.rest_method === 'POST') {
        rpOptions.body = body;
        // WARNING: do not set rpOptions.json = true/false; even for json content
        // rather ask user to set correct Content-Type: application/json header
      }

      rp(rpOptions).then(function (resp) {
        fulfill(resp);
      }).catch(function (err) {
        var msg = 'Rest request failed: ' + JSON.stringify(rpOptions.uri, null, ' ') + '.\nDetails: ' + err.message;
        self._logFailedRequestDetails(msg, err, null);
        reject(new Error(msg));
      });

    });
  });
};

RestQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = RestQuery;
