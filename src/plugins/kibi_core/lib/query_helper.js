var url = require('url');
var Promise = require('bluebird');
var _ = require('lodash');
var logger = require('./logger');

function QueryHelper(server) {
  this.server = server;
  this.config = server.config();
  this.log = logger(server, 'query_helper');
  this.client = server.plugins.elasticsearch.client;
}


QueryHelper.prototype.replaceVariablesForREST = function (headers, params, body, path, uri, variables, credentials) {
  // clone here !!! headers, params, body
  // so the original one in the config are not modified
  var h = _.cloneDeep(headers);
  var p = _.cloneDeep(params);
  var b = _.cloneDeep(body);
  var pa = _.cloneDeep(path);

  var self = this;
  // first try to replace placeholders using variables
  if (variables) {
    for (var name in variables) {
      if (variables.hasOwnProperty(name)) {
        var regex = new RegExp(self._escapeRegexSpecialCharacters(name), 'g');

        b = b.replace(regex, variables[name]);
        pa = pa.replace(regex, variables[name]);

        var i;
        for (i = 0; i < h.length; i++) {
          h[i].value = h[i].value.replace(regex, variables[name]);
        }

        for (i = 0; i < p.length; i++) {
          p[i].value = p[i].value.replace(regex, variables[name]);
        }

      }
    }
  }

  // second replace placeholders based on selected entity uri
  var promises = [
    self.replaceVariablesUsingEsDocument(h, uri, credentials),
    self.replaceVariablesUsingEsDocument(p, uri, credentials),
    self.replaceVariablesUsingEsDocument(b, uri, credentials),
    self.replaceVariablesUsingEsDocument(pa, uri, credentials)
  ];

  return Promise.all(promises).then(function (results) {
    return {
      headers: results[0],
      params: results[1],
      body: results[2],
      path: results[3]
    };
  });
};

/**
 * s can be either a string or (key, value) map
 */
QueryHelper.prototype.replaceVariablesUsingEsDocument = function (s, uri, credentials, datasource) {
  var self = this;
  if (!uri || uri.trim() === '') {
    return Promise.resolve(s);
  }

  var parts = uri.trim().split('/');
  if (parts.length < 3) {
    return Promise.reject(new Error('Malformed uri - should have at least 3 parts: index, type, id'));
  }

  var index = parts[0];
  var type = parts[1];
  var id = parts[2];

  return self.fetchDocument(index, type, id, credentials).then(function (doc) {
    //now parse the query and replace the placeholders
    if (typeof s === 'string' || s instanceof String) {
      return self._replaceVariablesInTheQuery(doc, s, datasource);
    } else {
      // array of objects with name value
      for (var i = 0; i < s.length; i++) {
        s[i].value = self._replaceVariablesInTheQuery(doc, s[i].value, datasource);
      }
      return s;
    }
  });
};

QueryHelper.prototype.fetchDocument = function (index, type, id, credentials) {
  var self = this;
  var client = self.client;
  if (credentials) {
    // Every time we fetch document for index different then .kibi one we need a client with logged in user credentials
    client = self.server.plugins.elasticsearch.createClient(credentials);
  }
  return client.search({
    index: index,
    type: type,
    q: '_id: "' + id + '"'
  }).then(function (doc) {
    if (doc.hits && doc.hits.hits.length === 1) {
      return doc.hits.hits[0];
    }
    return Promise.reject(new Error('No document matching _id=' + id + ' was found'));
  })
  .catch(function (err) {
    var msg = 'Could not fetch document [/' + index + '/' + type + '/' + id + '], check logs for details please.';
    self.log.warn(msg);
    self.log.warn(err);
    return Promise.reject(new Error(msg));
  });
};

/**
 * Replace variable placeholders
 * Currently supported syntax:
 *    @doc[_source][id]@
 *
 */
QueryHelper.prototype._replaceVariablesInTheQuery = function (doc, query, datasource) {
  var self = this;
  var ret = query;
  var regex = /(@doc\[.+?\]@)/g;
  var match = regex.exec(query);

  while (match !== null) {
    var group = match[1];
    group = group.replace('@doc', '');
    group = group.substring(0, group.length - 1);

    var value;
    if (group === '[_id]' && datasource === 'tinkerpop3_query') {
      let id = self._getValue(doc, group);
      let index = self._getValue(doc, '[_index]');
      let type = self._getValue(doc, '[_type]');
      value = index + '/' + type + '/' + id;
    } else {
      value = self._getValue(doc, group);
    }

    var reGroup = self._escapeRegexSpecialCharacters(match[1]);
    var re = new RegExp(reGroup, 'g');
    ret = ret.replace(re, value);

    match = regex.exec(query);
  }

  return ret;
};

QueryHelper.prototype._escapeRegexSpecialCharacters = function (s) {
  return s.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
};


QueryHelper.prototype._getValue = function (doc, group) {
  // parse a group and get the value from doc
  var value = null;
  var regex = /(\[[^\[\]].*?\])/g;
  var match = regex.exec(group);
  var i = 1;
  while (match !== null) {
    var propertyName =  match[1];
    // strip brackets
    propertyName = propertyName.substring(1, propertyName.length - 1);
    if (i === 1) {
      value = doc[propertyName];
    } else {
      value = value[propertyName];
    }
    i++;
    match = regex.exec(group);
  }
  return value;
};

QueryHelper.prototype.fetchDocuments = function (type) {
  var self = this;
  return self.client.search({
    index: self.config.get('kibana.index'),
    type: type,
    size: 100
  });
};

module.exports = QueryHelper;
