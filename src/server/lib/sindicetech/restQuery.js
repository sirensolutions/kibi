var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var rp      = require('request-promise');
var config  = require('../../config');
var logger  = require('../logger');
var jsonpath      = require('jsonpath');
var queryHelper = require('./query_helper');
var rulesHelper = require('../kibi/rules_helper');
var AbstractQuery = require('./abstractQuery');

function RestQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
}

RestQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': RestQuery
});


/* return a promise which when resolved should return
 * a following response object
 * {
 *    "boolean": true/false
 * }
 */
RestQuery.prototype.checkIfItIsRelevant = function (options) {
  // no document selected there is nothing to check against
  if (!options.selectedDocuments || options.selectedDocuments.length === 0) {
    return Promise.resolve({'boolean': true});
  }

  // empty rules - let it go
  if (this.config.activation_rules.length === 0) {
    return Promise.resolve({'boolean': true});
  }

  // evaluate the rules
  return rulesHelper.evaluate(this.config.activation_rules, options.selectedDocuments).then(function (res) {
    return {'boolean': res};
  });
};


RestQuery.prototype._logFailedRequestDetails = function (msg, originalError, resp) {
  logger.error(msg, originalError);
  logger.error('See the full resp object below');
  logger.error(resp);
};

RestQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  var self = this;

  if (self._checkIfSelectedDocumentRequiredAndNotPresent(options)) {
    return self._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }
  // currently we use only single selected document
  var uri = options.selectedDocuments && options.selectedDocuments.length > 0 ? options.selectedDocuments[0] : '';

  var url_s = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var username = this.config.datasource.datasourceClazz.datasource.datasourceParams.username;
  var password = this.config.datasource.datasourceClazz.datasource.datasourceParams.password;

  return new Promise(function (fulfill, reject) {
    var start = new Date().getTime();
    var regex = /^GET|POST$/;

    if (!regex.test(self.config.rest_method)) {
      reject(new Error('Only GET|POST methods are supported at the moment'));
    }

    if ( !(self.config.rest_params instanceof Array)) {
      reject(new Error('rest_params should be an Array. Check the elasticsearch mapping'));
    }

    if ( !(self.config.rest_headers instanceof Array)) {
      reject(new Error('rest_headers should be an Array. Check the elasticsearch mapping'));
    }

    // user can also use a special variables like $auth_token
    var availableVariables = {
      // for now we support only auth_token username password
      // so user can provide any of these in params, headers, or body
      '${auth_token}': self.config.datasource.datasourceClazz.populateParameters('${auth_token}'),
      '${username}': self.config.datasource.datasourceClazz.populateParameters('${username}'),
      '${password}': self.config.datasource.datasourceClazz.populateParameters('${password}')
    };


    // the whole replacement of values is happening here
    queryHelper.replaceVariablesForREST(
      self.config.rest_headers,
      self.config.rest_params,
      self.config.rest_body,
      self.config.rest_path,
      uri, availableVariables)
    .then(function (results) {
      // here convert the params and headers from array to map
      var headers = _.zipObject(_.pluck(results.headers, 'name'), _.pluck(results.headers, 'value'));
      var params = _.zipObject(_.pluck(results.params, 'name'), _.pluck(results.params, 'value'));
      var body = results.body;
      var path = results.path;

      var key;
      if (self.cache) {
        key = self.config.rest_method + url_s + path + JSON.stringify(headers) + JSON.stringify(params) + body;
      }

      if (self.cache) {
        var v = self.cache.get(key);
        if (v) {
          return fulfill(v);
        }
      }

      // to check any option visit
      // https://github.com/request/request#requestoptions-callback
      var rp_options = {
        method: self.config.rest_method,
        uri: url.parse(url.resolve(url_s, path)),
        headers: headers,
        timeout: timeout || 5000,
        transform: function (body, resp) {
          var data = {
            results: {}
          };
          if (resp.statusCode !== self.config.rest_resp_status_code) {
            var msg = 'Invalid response status code: [' + resp.statusCode + '] Expected: [' + self.config.rest_resp_status_code + ']';
            self._logFailedRequestDetails(msg, null, resp);
            throw new Error(msg);
          }

          // TODO: change this once we support xml resp or text resp
          var json;
          try {
            json = JSON.parse(body);
          } catch (e) {
            var msg = 'Error while parsing body as JSON. Details: ' + e.message;
            self._logFailedRequestDetails(msg, e, resp);
            throw new Error(msg);
          }

          // extract subset of the data only if user specified jsonpath expression
          if (self.config.rest_resp_restriction_path && self.config.rest_resp_restriction_path !== '') {
            try {
              data.results = jsonpath.query(json, self.config.rest_resp_restriction_path);
            } catch (e) {
              var msg = 'Error while executing the JSONPath expression. Details: ' + e.message;
              self._logFailedRequestDetails(msg, e, resp);
              throw new Error(msg);
            }
          } else {
            data.results = json;
          }

          if (self.cache) {
            self.cache.set(key, data, max_age);
          }
          return data;
        }
      };

      if (username && password) {
        rp_options.auth = {
          // as they might be encrypted make sure to call populateParameters
          username: self.config.datasource.datasourceClazz.populateParameters('${username}'),
          password: self.config.datasource.datasourceClazz.populateParameters('${password}'),
          sendImmediately: false
        };
      }

      if (self.config.rest_method === 'GET') {
        rp_options.qs = params;
      } else if (self.config.rest_method === 'POST') {
        rp_options.body = body;
        // WARNING: do not set rp_options.json = true/false; even for json content
        // rather ask user to set correct Content-Type: application/json header
      }

      rp(rp_options).then(function (resp) {
        fulfill(resp);
      }).catch(function (err) {
        var msg = 'Rest request failed. Details: ' + err.message;
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
