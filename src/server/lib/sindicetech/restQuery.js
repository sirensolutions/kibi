var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var rp      = require('request-promise');
var config  = require('../../config');
var logger  = require('../logger');
var jsonpath      = require('jsonpath');
var queryHelper = require('./query_helper');
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
RestQuery.prototype.checkIfItIsRelevant = function (uri) {
  // in case of rest query the activation query is a regex string
  var query = '';
  if (this.config.activationQuery) {
    query = this.config.activationQuery.trim();
  }

  if (query === '') {
    return Promise.resolve({'boolean': true});
  }

  // here match uri against the regex
  try {
    var regex = new RegExp(query);
    return Promise.resolve({'boolean': regex.test(uri)});
  } catch (e) {
    return Promise.reject(new Error('Problem parsing regex [' + query + ']'));
  }
};


RestQuery.prototype._logFailedRequestDetails = function (msg, originalError, resp) {
  logger.error(msg, originalError);
  logger.error('See the full resp object below');
  logger.error(resp);
};

RestQuery.prototype.fetchResults = function (uri, onlyIds, idVariableName) {
  var self = this;

  var url_s = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  var method = this.config.datasource.datasourceClazz.datasource.datasourceParams.method.toLowerCase();
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  var username = this.config.datasource.datasourceClazz.datasource.datasourceParams.username;
  var password = this.config.datasource.datasourceClazz.datasource.datasourceParams.password;

  return new Promise(function (fulfill, reject) {
    var start = new Date().getTime();
    var regex = /^get|post$/;

    if (!regex.test(method)) {
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
      uri, availableVariables)
    .then(function (results) {
      // here convert the params and headers from array to map
      var headers = _.zipObject(_.pluck(results.headers, 'name'), _.pluck(results.headers, 'value'));
      var params = _.zipObject(_.pluck(results.params, 'name'), _.pluck(results.params, 'value'));
      var body = results.body;

      var key;
      if (self.cache) {
        key = method + url_s + self.config.rest_path + JSON.stringify(headers) + JSON.stringify(params) + body;
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
        method: method.toUpperCase(),
        uri: url.parse(url.resolve(url_s, self.config.rest_path)),
        headers: headers,
        timeout: timeout || 5000,
        transform: function (body, resp) {
          var data = {
            results: {}
          };
          if (resp.statusCode !== self.config.rest_resp_status_code) {
            var msg = 'Response status code [' + resp.statusCode + '] while expected [' + self.config.rest_resp_status_code + ']';
            self._logFailedRequestDetails(msg, null, resp);
            throw new Error(msg);
          }

          // TODO: change this once we support xml resp or text resp
          try {
            data.results = jsonpath.query(JSON.parse(body), self.config.rest_resp_restriction_path);
          } catch (e) {
            var msg = 'Error while applying the jsonpath expression. Details: ' + e.message;
            self._logFailedRequestDetails(msg, e, resp);
            throw new Error(msg);
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

      if (method === 'get') {
        rp_options.qs = params;
      } else if (method === 'post') {
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
