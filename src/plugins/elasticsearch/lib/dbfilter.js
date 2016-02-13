var util = require('./util');
var kibiUtils = require('kibiutils');
var _ = require('lodash');
var Promise = require('bluebird');

/**
 * Evaluate the custom dbfilter query and replace it with the equivalent ElasticSearch query.
 * QueryEngine is the queryEngine object, JSON is the query to modify.
 */
module.exports = function (queryEngine, json) {
  return Promise.try(function () {
    var label = 'dbfilter';
    // The modify callback must return a Promise.
    var objects = util.traverse(json, label, function modify(err, data) {
      // Change the nested object data into a bool query
      if (err) {
        throw err;
      }

      var queryid = data.queryid;
      var queryVariableName = data.queryVariableName;
      var path = data.path;
      var entity = data.entity;
      var negate = data.negate;

      if (queryid === undefined) {
        throw new Error('Missing queryid field in the dbfilter object: ' + data);
      }
      if (queryVariableName === undefined) {
        throw new Error('Missing queryVariableName in the dbfilter object: ' + data);
      }
      if (path === undefined) {
        throw new Error('Missing path field in the dbfilter object: ' + data);
      }

      return queryEngine.getIdsFromQueries([{queryId:queryid, queryVariableName: queryVariableName}], {selectedDocuments: [entity]})
        .then(function createObject(queries) {
          return new Promise(function (fulfill, reject) {
            var filter = {};

            if (queries[0].ids.length === 0) {
              if (queries[0].queryActivated === true) {
                // empty bool
                // GH-117: need to put here a filter that will match nothing
                filter.should = [{
                  term: {
                    snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
                  }
                }];
                fulfill(filter);
              } else {
                // delete the entry
                fulfill({ delete: true });
              }
            } else {
              filter[negate ? 'must_not' : 'should'] = [];
              var filterId = {
                terms: {}
              };
              filterId.terms[path] = queries[0].ids;
              filter[negate ? 'must_not' : 'should'].push(filterId);
              fulfill(filter);
            }
          });
        });
    });

    var promises = _.map(objects, function (object) {
      return object.value;
    });

    return Promise.all(promises).then(function (data) {
      for (var i = 0; i < data.length; i++) {
        var path = objects[i].path;
        if (data[i].hasOwnProperty('delete')) {
          // only delete the dbfilter object.
          // If it is the only child, delete the parent as well.
          _deleteDBfilter(json, path, label);
        } else {
          util.replace(json, path, label, 'bool', data[i]);
        }
      }
      return json;
    });
  });
};

function _deleteDBfilter(json, path, label) {
  kibiUtils.goToElement(json, path.slice(0, path.length - 1), function (njson) {
    if (path.length === 0) {
      // dbfilter at the root
      delete njson[label];
      return;
    }

    var lastPart = path[path.length - 1];
    var length = 0;
    for (var att in njson[lastPart]) {
      if (njson[lastPart].hasOwnProperty(att)) {
        if (++length > 1) {
          break;
        }
      }
    }

    if (length === 1) {
      delete njson[lastPart];
    } else {
      delete njson[lastPart][label];
    }
  });
}
