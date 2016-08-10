var util = require('./util');
var kibiUtils = require('kibiutils');
var _ = require('lodash');
var Promise = require('bluebird');

/**
 * Evaluate the custom dbfilter query and replace it with the equivalent ElasticSearch query.
 * QueryEngine is the queryEngine object, JSON is the query to modify.
 */
module.exports = function (queryEngine, json, credentials) {
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

      var options = {
        selectedDocuments: [entity]
      };
      if (credentials) {
        options.credentials = credentials;
      }

      return queryEngine.getIdsFromQueries([{queryId: queryid, queryVariableName: queryVariableName}], options)
      .then(function createObject(queries) {
        return new Promise(function (fulfill, reject) {
          var filter = {};

          if (queries[0].ids.length === 0) {
            // empty bool
            // GH-117: need to put here a filter that will match nothing
            filter[negate ? 'must_not' : 'should'] = [
              {
                term: {
                  snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
                }
              }
            ];
            fulfill(filter);
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
        util.replace(json, path, label, 'bool', data[i]);
      }
      return json;
    });
  });
};
