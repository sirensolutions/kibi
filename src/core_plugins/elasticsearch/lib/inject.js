import util from './util';
import _ from 'lodash';
import kibiUtils from 'kibiutils';
import Promise from 'bluebird';

// The set of custom queries
const _customQueries = [ 'inject' ];

/**
 * Save stores the custom queries and removes them from the query body.
 * It returns an object with the saved queries.
 */
exports.save = function (query) {
  function getQuery(err, data) {
    if (err) {
      throw err;
    }
    return data;
  }

  const _savedQueries = {};
  for (let i = 0; i < _customQueries.length; i++) {
    const label = _customQueries[i];
    const objects = util.traverse(query, label, getQuery);

    if (objects.length === 1) {
      util.delete(query, objects[0].path, label);

      const injectQueries = objects[0].value;
      const nbQueryDefs = _.reduce(injectQueries, (acc, injectQuery) => acc + injectQuery.queryDefs.length, 0);
      if (nbQueryDefs) {
        _savedQueries[label] = injectQueries;
      }
    } else if (objects.length > 1) {
      throw new Error('Expected only one ' + label + ' query object');
    }
  }
  return _savedQueries;
};

/**
 * RunSavedQueries executes the custom queries that were previously saved
 * and adds the id of queries which intersect with the result set in the given response object within
 * the fields attribute of each hit.
 */
exports.runSavedQueries = function (response, queryEngine, savedQueries, credentials) {
  if (savedQueries.length === 0) {
    return Promise.resolve(response);
  }

  const promises = [];

  for (const key in savedQueries) {
    if (savedQueries.hasOwnProperty(key)) {
      for (let i = 0; i < savedQueries[key].length; i++) {
        const savedQuery = savedQueries[key][i];
        switch (key) {
          case 'inject':
            promises.push(exports._runInject(savedQuery, queryEngine, credentials));
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
    for (let i = 0; i < response.responses.length; i++) {
      if (response.responses[i].hits !== undefined) {

        // for each of the hits, apply the post-process queries
        const hits = response.responses[i].hits.hits;
        for (let j = 0; j < hits.length; j++) {
          if (!hits[j].hasOwnProperty('fields')) {
            hits[j].fields = {};
          }
          for (let k = 0; k < runQueries.length; k++) {
            const res = runQueries[k](hits[j]);
            hits[j].fields[res.key] = res.value;
          }
        }

      }
    }
  }
  return response;
}

/**
 * RunInject runs the given query and returns a function that stores the results into an object for a given hit
 */
exports._runInject = function (query, queryEngine, credentials) {
  return Promise.try(function () {
    const entityURI = query.entityURI;
    const queryDefs = query.queryDefs;
    const sourcePath = query.sourcePath;
    const fieldName = query.fieldName;

    if (queryDefs === undefined) {
      throw new Error('Missing queryDefs field in the inject object: ' + query);
    }
    if (sourcePath === undefined) {
      throw new Error('Missing sourcePath field in the inject object: ' + query);
    }
    if (fieldName === undefined) {
      throw new Error('Missing fieldName field in the inject object: ' + query);
    }

    return queryEngine.getIdsFromQueries(queryDefs, { selectedDocuments: [entityURI], credentials })
    .then(function (setOfIds) {
      return function (hit) {
        const res = {
          key: fieldName,
          value: []
        };

        const ids = kibiUtils.getValuesAtPath(hit._source, sourcePath);
        // for each result set of a query
        for (let i = 0; i < setOfIds.length; i++) {
          // for each result in the set for that query
          for (let j = 0; j < setOfIds[i].ids.length; j++) {
            const id = setOfIds[i].ids[j];
            if (_.contains(ids, id)) {
              res.value.push(queryDefs[i].queryId);
              break;
            }
          }
        }

        return res;
      };
    });
  });
};
