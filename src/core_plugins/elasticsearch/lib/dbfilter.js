import util from './util';
import Promise from 'bluebird';

/**
 * Evaluate the custom dbfilter query and replace it with the equivalent ElasticSearch query.
 * QueryEngine is the queryEngine object, JSON is the query to modify.
 */
module.exports = function (queryEngine, json, credentials) {
  return Promise.try(function () {
    const label = 'dbfilter';
    // The modify callback must return a Promise.
    const objects = util.traverse(json, label, function modify(err, data) {
      // Change the nested object data into a bool query
      if (err) {
        throw err;
      }

      const queryId = data.queryid;
      const queryVariableName = data.queryVariableName;
      const path = data.path;
      const entity = data.entity;
      const negate = data.negate;

      if (queryId === undefined) {
        throw new Error('Missing queryid field in the dbfilter object: ' + data);
      }
      if (queryVariableName === undefined) {
        throw new Error('Missing queryVariableName in the dbfilter object: ' + data);
      }
      if (path === undefined) {
        throw new Error('Missing path field in the dbfilter object: ' + data);
      }

      const options = {
        selectedDocuments: [ entity ]
      };
      if (credentials) {
        options.credentials = credentials;
      }

      return queryEngine.getIdsFromQueries([ { queryId, queryVariableName } ], options)
      .then(function createObject([ query ]) {
        const filter = {};
        const clause = negate ? 'must_not' : 'should';

        if (query.ids.length === 0) {
          // empty bool
          // GH-117: need to put here a filter that will match nothing
          filter[clause] = [
            {
              term: {
                snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
              }
            }
          ];
        } else {
          filter[clause] = [
            {
              terms: {
                [ path ]: query.ids
              }
            }
          ];
        }
        return [
          query.queryId,
          query.label,
          { bool: filter }
        ];
      });
    });

    return Promise.map(objects, object => object.value)
    .then(function (data) {
      for (let i = 0; i < data.length; i++) {
        const [ queryId, queryLabel, esFilter ] = data[i];
        const path = objects[i].path;
        const oldBucketLabel = path.pop();
        const newBucketLabel = oldBucketLabel.replace(queryId, `${queryId} - ${queryLabel}`);
        util.replace(json, path, oldBucketLabel, newBucketLabel, esFilter);
      }
      return json;
    });
  });
};
