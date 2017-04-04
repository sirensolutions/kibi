import url from 'url';
import Promise from 'bluebird';
import _ from 'lodash';
import logger from './logger';

function QueryHelper(server) {
  this.server = server;
  this.config = server.config();
  this.log = logger(server, 'query_helper');
  this._cluster = server.plugins.elasticsearch.getCluster('data');
}

QueryHelper.prototype.replaceVariablesForREST = function (headers, params, body, path, options, variables) {
  // clone here !!! headers, params, body
  // so the original one in the config are not modified
  const h = _.cloneDeep(headers);
  const p = _.cloneDeep(params);
  let b = _.cloneDeep(body);
  let pa = _.cloneDeep(path);

  const self = this;
  // first try to replace placeholders using variables
  if (variables) {
    for (const name in variables) {
      if (variables.hasOwnProperty(name)) {
        const regex = new RegExp(self._escapeRegexSpecialCharacters(name), 'g');

        b = b.replace(regex, variables[name]);
        pa = pa.replace(regex, variables[name]);

        let i;
        for (i = 0; i < h.length; i++) {
          h[i].value = h[i].value.replace(regex, variables[name]);
        }

        for (i = 0; i < p.length; i++) {
          p[i].value = p[i].value.replace(regex, variables[name]);
        }

      }
    }
  }

  // second replace placeholders based on selected entity
  const promises = [
    self.replaceVariablesUsingEsDocument(h, options),
    self.replaceVariablesUsingEsDocument(p, options),
    self.replaceVariablesUsingEsDocument(b, options),
    self.replaceVariablesUsingEsDocument(pa, options)
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
QueryHelper.prototype.replaceVariablesUsingEsDocument = function (s, { selectedDocuments, credentials } = {}, datasource) {
  const self = this;
  const entity = selectedDocuments && selectedDocuments[0];

  if (!entity) {
    return Promise.resolve(s);
  }

  // check if the query has a variable
  const regex = /(@doc\[.+?\]@)/g;
  if (typeof s === 'string' || s instanceof String) {
    if (regex.exec(s) === null) {
      return Promise.resolve(s);
    }
  } else {
    let hasMatch = false;
    for (let i = 0; i < s.length; i++) {
      if (regex.exec(s[i].value) !== null) {
        hasMatch = true;
        break;
      }
    }
    if (!hasMatch) {
      return Promise.resolve(s);
    }
  }

  const { index, type, id } = entity;

  if (!index || !type || !id) {
    return Promise.reject(new Error('The selected document should be identified with 3 components: index, type, and id'));
  }

  return self.fetchDocument(index, type, id, credentials).then(function (doc) {
    //now parse the query and replace the placeholders
    if (typeof s === 'string' || s instanceof String) {
      return self._replaceVariablesInTheQuery(doc, s, datasource);
    } else {
      // array of objects with name value
      for (let i = 0; i < s.length; i++) {
        s[i].value = self._replaceVariablesInTheQuery(doc, s[i].value, datasource);
      }
      return s;
    }
  });
};

QueryHelper.prototype.fetchDocument = function (index, type, id, credentials) {
  let client = this._cluster.getClient();
  if (credentials) {
    client = this._cluster.createClient(credentials);
  }
  return client.search({
    size: 1,
    index,
    body: {
      query: {
        ids: {
          type,
          values: [ id ]
        }
      }
    }
  }).then(function (doc) {
    if (doc.hits && doc.hits.hits.length === 1) {
      return doc.hits.hits[0];
    }
    return Promise.reject(new Error('No document matching _id=' + id + ' was found'));
  })
  .catch(err => {
    const msg = `Could not fetch document [/${index}/${type}/${id}], check logs for details please.`;
    this.log.warn(msg);
    this.log.warn(err);
    return Promise.reject(new Error(msg));
  });
};

QueryHelper.prototype._arrayToCommaSeparatedList = function (a) {
  let ret = '';
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (i > 0) {
      ret += ',';
    }
    if (typeof v === 'string' || v instanceof String) {
      ret += '"' + v.replace(/"/, '\\"') + '"';
    } else if (v !== null && typeof v === 'object') {
      ret += JSON.stringify(v);
    } else {
      ret += v;
    }
  }
  return ret;
};

/**
 * Replace variable placeholders
 * Currently supported syntax:
 *    @doc[_source][id]@
 * Special variables @doc[_source][id]@
 * will be replaced by values extracted from the documents
 * matching the current selection
 *
 */
QueryHelper.prototype._replaceVariablesInTheQuery = function (doc, query, datasource) {
  const self = this;
  let ret = query;
  const regex = /(@doc\[.+?\]@)/g;
  let match = regex.exec(query);

  while (match !== null) {
    let group = match[1];
    group = group.replace('@doc', '');
    group = group.substring(0, group.length - 1);

    const value = self._getValue(doc, group);

    if (value instanceof Array) {
      value = self._arrayToCommaSeparatedList(value);
    }

    const reGroup = self._escapeRegexSpecialCharacters(match[1]);
    const re = new RegExp(reGroup, 'g');
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
  let value = null;
  const regex = /(\[[^\[\]].*?\])/g;
  let match = regex.exec(group);
  let i = 1;
  while (match !== null) {
    let propertyName =  match[1];
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
  return this._cluster.callWithInternalUser('search', {
    index: this.config.get('kibana.index'),
    type: type,
    size: 100
  });
};

module.exports = QueryHelper;
