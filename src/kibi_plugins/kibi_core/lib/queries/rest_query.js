import { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } from '../_symbols';
import _ from 'lodash';
import Promise from 'bluebird';
import url from 'url';
import rp from 'request-promise';
import jsonpath from 'jsonpath';
import AbstractQuery from './abstract_query';
import QueryHelper from '../query_helper';
import RulesHelper from '../rules_helper';
import logger from '../logger';

function RestQuery(server, queryDefinition, cache) {
  AbstractQuery.call(this, server, queryDefinition, cache);
  this.logger = logger(server, 'rest_query');
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
    return Promise.resolve(SELECTED_DOCUMENT_NEEDED);
  }

  // no document selected there is nothing to check against
  if (!options.selectedDocuments || options.selectedDocuments.length === 0) {
    return Promise.resolve(QUERY_RELEVANT);
  }

  // empty rules - let it go
  if (this.config.activation_rules.length === 0) {
    return Promise.resolve(QUERY_RELEVANT);
  }

  // evaluate the rules
  return this.rulesHelper.evaluate(this.config.activation_rules, options)
  .then(res => res ? QUERY_RELEVANT : QUERY_DEACTIVATED);
};

RestQuery.prototype._logFailedRequestDetails = function (msg, originalError, resp) {
  this.logger.error(msg, originalError);
  this.logger.error('See the full resp object below');
  this.logger.error(resp);
};

const mergeObjects = function (dest, sourceObject, sourcePath) {
  const source = _.get(sourceObject, sourcePath);
  if (source) {
    _.each(source, candidate => {
      const found = _.find(dest, c => c.name === candidate.name);
      if (!found) {
        dest.push(candidate);
      }
    });
  }
};

RestQuery.prototype.fetchResults = function (options, onlyIds, idVariableName) {
  const self = this;

  const urlS = this.config.datasource.datasourceClazz.datasource.datasourceParams.url;
  const timeout = this.config.datasource.datasourceClazz.datasource.datasourceParams.timeout;
  const maxAge = this.config.datasource.datasourceClazz.datasource.datasourceParams.max_age;
  const username = this.config.datasource.datasourceClazz.datasource.datasourceParams.username;
  const password = this.config.datasource.datasourceClazz.datasource.datasourceParams.password;
  const cacheEnabled = this.config.datasource.datasourceClazz.datasource.datasourceParams.cache_enabled;

  return new Promise(function (fulfill, reject) {
    const start = new Date().getTime();
    const regex = /^GET|POST$/;

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
    const availableVariables = {
      // for now we support only auth_token username password
      // so user can provide any of these in params, headers, or body
      '${auth_token}': self.config.datasource.datasourceClazz.populateParameters('${auth_token}'),
      '${username}': self.config.datasource.datasourceClazz.populateParameters('${username}'),
      '${password}': self.config.datasource.datasourceClazz.populateParameters('${password}')
    };

    // get all params from datasource and merge them with the one from the query
    const mergedHeaders = [];
    const mergedParams = [];
    mergeObjects(mergedHeaders, self.config, 'rest_headers');
    mergeObjects(mergedHeaders, self.config, 'datasource.datasourceParams.headers');
    mergeObjects(mergedParams, self.config, 'rest_params');
    mergeObjects(mergedParams, self.config, 'datasource.datasourceParams.params');

    // the whole replacement of values is happening here
    self.queryHelper.replaceVariablesForREST(
      mergedHeaders,
      mergedParams,
      self.config.rest_body,
      self.config.rest_path,
      options,
      availableVariables
    ).then(function (results) {
      // here convert the params and headers from array to map
      const headers = _.zipObject(_.pluck(results.headers, 'name'), _.pluck(results.headers, 'value'));
      const params = _.zipObject(_.pluck(results.params, 'name'), _.pluck(results.params, 'value'));
      const body = results.body;
      const path = results.path;

      let key;
      if (self.cache && cacheEnabled) {
        key = self.generateCacheKey(
          self.config.rest_method,
          urlS,
          path,
          JSON.stringify(headers),
          JSON.stringify(params),
          body,
          self._getUsername(options));
        const v = self.cache.get(key);
        if (v) {
          return fulfill(v);
        }
      }

      // to check any option visit
      // https://github.com/request/request#requestoptions-callback
      const rpOptions = {
        method: self.config.rest_method,
        uri: url.parse(url.resolve(urlS, path)),
        headers: headers,
        timeout: timeout || 5000,
        transform: function (body, resp) {
          let msg;
          const data = {
            queryId: self.id,
            label: self.config.label,
            results: {}
          };
          if (resp.statusCode !== self.config.rest_resp_status_code) {
            msg = 'Invalid response status code: [' + resp.statusCode + '] Expected: [' + self.config.rest_resp_status_code + ']';
            self._logFailedRequestDetails(msg, null, resp);
            throw new Error(msg);
          }

          // TODO: / Kibi / change this once we support xml resp or text resp
          let json;
          try {
            json = JSON.parse(body);
          } catch (e) {
            msg = 'Error while parsing body as JSON. Details: ' + e.message;
            self._logFailedRequestDetails(msg, e, resp);
            throw new Error(msg);
          }

          data.results = json;

          if (idVariableName && self.config.rest_variables) {
            const o = _.find(self.config.rest_variables, function (v) {
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

      return rp(rpOptions).then(function (resp) {
        fulfill(resp);
      }).catch(function (err) {
        const msg = 'Rest request failed: ' + JSON.stringify(rpOptions.uri, null, ' ') + '.\nDetails: ' + err.message;
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
