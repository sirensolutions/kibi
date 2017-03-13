define(function (require) {
  return function ShouldEntityURIBeEnabledFactory(savedQueries, Promise) {
    const _ = require('lodash');
    const doesQueryDependOnEntity = require('kibiutils').doesQueryDependOnEntity;

    return function (queryIds) {
      if (!queryIds) {
        return Promise.resolve(false);
      }
      queryIds = _.compact(queryIds);
      if (!queryIds.length) {
        return Promise.resolve(false);
      }
      return savedQueries.find().then((results) => {
        const missingQueries = _.filter(queryIds, (queryId) => !_.find(results.hits, 'id', queryId));
        if (missingQueries.length) {
          return Promise.reject(new Error(`Unable to find queries: ${JSON.stringify(missingQueries)}`));
        }

        const queries = _.filter(results.hits, (hit) => _.contains(queryIds, hit.id));
        return doesQueryDependOnEntity(queries);
      });
    };
  };
});
