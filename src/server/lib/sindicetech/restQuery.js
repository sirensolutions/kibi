var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var rp      = require('request-promise');
var config  = require('../../config');
var logger  = require('../logger');
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

  return Promise.resolve({'boolean': false});
};


RestQuery.prototype.fetchResults = function (uri, onlyIds, idVariableName) {
  var self = this;

  var url_s = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  var method = this.config.datasource.datasourceClazz.datasource.datasourceParams.method.toLowerCase();
  var timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  var max_age = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;


  return new Promise(function (fulfill, reject) {
    var start = new Date().getTime();
    var regex = /^get|post$/;

    if (!regex.test(method)) {
      reject(new Error('Only GET|POST methods are supported at the moment'));
    }

    if (uri.indexOf('rest://') !== 0) {
      reject(new Error('Wrong URI scheme. For rest query uri scheme should strat with "rest://"'));
    }

    var variables = uri.substring('rest://'.length).split('/');

    _.each(variables, function (v, index) {
      variables[index] = variables[index].replace(/--SLASH--/g, '/');
    });

    var data = {};
    var headers = {};
    regex = /@VAR([0-9]{1,})@/;

    if ( !(self.config.rest_params instanceof Array)) {
      reject(new Error('rest_params should be an Array. Check the elasticsearch mapping'));
    }

    _.each(self.config.rest_params, function (param) {
      if (regex.test(param.value)) {
        var match = regex.exec(param.value);
        if (match && match.length > 1) {
          var index = match[1];
          data[param.name] = variables[index];
        } else {
          reject(
            new Error(
              'Something wrong with the variable placeholder. Variable palceholders should follow the format: @VAR0@, @VAR1@, ...'
            )
          );
        }
      } else {
        data[param.name] = param.value;
      }
    });

    _.each(self.config.rest_headers, function (header) {
      if (regex.test(header.value)) {
        var match = regex.exec(header.value);
        if (match && match.length > 1) {
          var index = match[1];
          headers[header.name] = variables[index];
        } else {
          reject(
            new Error(
              'Something wrong with the variable placeholder. Variable palceholders should follow the format: @VAR0@, @VAR1@, ...'
            )
          );
        }
      } else {
        headers[header.name] = header.value;
      }
    });

    var key;
    if (self.cache) {
      key = url_s + method + JSON.stringify(headers) + JSON.stringify(data);
    }

    if (self.cache) {
      var v = self.cache.get(key);
      if (v) {
        return fulfill(v);
      }
    }

    var rp_options = {
      method: method.toUpperCase(),
      uri: url.parse(url_s),
      headers: headers,
      timeout: timeout || 5000,
      transform: function (resp) {
        var data = {
          results: JSON.parse(resp)
        };
        if (self.cache) {
          self.cache.set(key, data, max_age);
        }
        return data;
      }
    };

    if (method === 'get') {
      rp_options.qs = data;
    } else {
      // set body or json
      // TODO: work on it
      rp_options.body = '';
      rp_options.json = {};
    }

    rp(rp_options).then(function (resp) {
      fulfill(resp);
    }).catch(function (err) {
      reject(err);
    });
  });
};

RestQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = RestQuery;
