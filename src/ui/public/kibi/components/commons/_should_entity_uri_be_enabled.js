import _ from 'lodash';
import { doesQueryDependOnEntity } from 'kibiutils';
import 'plugins/kibi_core/management/sections/kibi_queries/services/saved_queries';

export function ShouldEntityURIBeEnabledFactory(savedQueries, Promise) {
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
