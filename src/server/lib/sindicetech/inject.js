var util = require('./util');
var kibiUtils = require('kibiutils');
var Promise = require('bluebird');

// The set of custom queries
var _customQueries = [ 'inject' ];

/**
 * Save stores the custom queries and removes them from the query body.
 * It returns an object with the saved queries.
 */
exports.save = function (query) {
  function getQuery(err, data) {
    if (err) {
      throw err;
    }
    if (++count > 1) {
      throw new Error('Expected only one ' + label + ' query object');
    }
    return data;
  }

  var _savedQueries = {};
  for (var i = 0; i < _customQueries.length; i++) {
    var label = _customQueries[i];
    var count = 0;
    var objects = util.traverse(query, label, getQuery);

    if (objects.length === 1) {
      util.delete(query, objects[0].path, label);
      _savedQueries[label] = objects[0].value;
    }
  }
  return _savedQueries;
};

/**
 * RunSavedQueries executes the custom queries that were previously saved
 * and adds the id of queries which intersect with the result set in the given response object within
 * the fields attribute of each hit.
 */
exports.runSavedQueries = function (response, queryEngine, savedQueries) {
  if (savedQueries.length === 0) {
    return Promise.resolve(response);
  }

  var promises = [];

  for (var key in savedQueries) {
    if (savedQueries.hasOwnProperty(key)) {
      for (var i = 0; i < savedQueries[key].length; i++) {
        var savedQuery = savedQueries[key][i];
        switch (key) {
          case 'inject':
            promises.push(exports._runInject(savedQuery, queryEngine));
            break;
        }
      }
    }
  }

  return Promise.all(promises).then(function (runQueries) {
    return _runSavedQueries(response, runQueries);
  });
};

/**
 * Runs the set of query functions over each hit in the response
 */
function _runSavedQueries(response, runQueries) {
  if (response.responses !== undefined) {
    for (var i = 0; i < response.responses.length; i++) {
      if (response.responses[i].hits !== undefined) {

        // for each of the hits, apply the post-process queries
        var hits = response.responses[i].hits.hits;
        for (var j = 0; j < hits.length; j++) {
          if (!hits[j].hasOwnProperty('fields')) {
            hits[j].fields = {};
          }
          for (var k = 0; k < runQueries.length; k++) {
            var res = runQueries[k](hits[j]._source);
            hits[j].fields[res.key] = res.value;
          }
        }

      }
    }
  }
  return response;
}

/**
 * RunInject runs the given query and returns a function that stores the results into an object for a given source
 */
exports._runInject = function (query, queryEngine) {
  return Promise.try(function () {
    var entityURI = query.entityURI;
    var queryDefs = query.queryDefs;
    var sourcePath = query.sourcePath;
    var fieldName = query.fieldName;

    if (queryDefs === undefined) {
      throw new Error('Missing queryDefs field in the inject object: ' + query);
    }
    if (sourcePath === undefined) {
      throw new Error('Missing sourcePath field in the inject object: ' + query);
    }
    if (fieldName === undefined) {
      throw new Error('Missing fieldName field in the inject object: ' + query);
    }

    sourcePath = sourcePath.split('.');

    return queryEngine.getIdsFromQueries(queryDefs, {selectedDocuments: [entityURI]})
    .then(function (setOfIds) {
      return function (source) {
        var res = { key: fieldName, value: [] };
        kibiUtils.goToElement(source, sourcePath.slice(0, sourcePath.length - 1), function (val) {
          var lastPart = sourcePath[sourcePath.length - 1];

          // for each result set of a query
          for (var i = 0; i < setOfIds.length; i++) {
            // for each result in the set for that query
            for (var j = 0; j < setOfIds[i].ids.length; j++) {
              var id = setOfIds[i].ids[j];
              if (_findId(val, lastPart, id)) {
                res.value.push(queryDefs[i].queryId);
                break;
              }
            }
          }
        });

        return res;
      };
    });
  });
};

/**
 * FindId returns true if there is property with value id in the given val
 */
function _findId(val, property, id) {
  if (!val) {
    return false;
  }
  if (val.constructor === Object) {
    if (val.hasOwnProperty(property)) {
      if (!val[property]) {
        return false;
      }
      if (val[property] === id) {
        return true;
      } else if (val[property].constructor === Array) {
        for (var i = 0; i < val[property].length; i++) {
          if (val[property][i] === id) {
            return true;
          }
        }
      }
    } else {
      throw new Error('No property=[' + property + '] in ' + JSON.stringify(val, null, ' '));
    }
  } else if (val.constructor === Array) {
    for (var vali = 0; vali < val.length; vali++) {
      if (_findId(val[vali], property, id)) {
        return true;
      }
    }
  } else {
    throw new Error('Unknown object: ' + val);
  }
  return false;
}
