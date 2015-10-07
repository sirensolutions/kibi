var url    = require('url');
var rp     = require('request-promise');
var config = require('../../config');


function QueryHelper() {}


QueryHelper.prototype.fetchDocument = function (index, type, id) {
  return rp({
    method: 'GET',
    uri: url.parse(config.kibana.elasticsearch_url + '/' + index + '/' + type + '/' + id),
    transform: function (resp) {
      var data = JSON.parse(resp);
      return data;
    }
  });
};

/**
 * Replace variable placeholders
 * Currently supported syntax:
 *    @doc[_source][id]@
 *
 */
QueryHelper.prototype.replaceVariablesInTheQuery = function (doc, query) {
  var self = this;
  var ret = query;
  var regex = /(@doc\[.+?\]@)/g;
  var match = regex.exec(query);

  while (match !== null) {
    var group = match[1];
    group = group.replace('@doc', '');
    group = group.substring(0, group.length - 1);

    var value = self._getValue(doc, group);
    var reGroup = match[1].replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
    var re = new RegExp(reGroup, 'g');
    ret = ret.replace(re, value);

    match = regex.exec(query);
  }

  return ret;
};


QueryHelper.prototype._getValue = function (doc, group) {
  // parse a group and get the value from doc
  var value = null;
  var regex = /(\[[^\[\]].+?\])/g;
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


module.exports = new QueryHelper();
