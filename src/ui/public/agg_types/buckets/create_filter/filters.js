import { buildQueryFilter } from 'ui/filter_manager/lib/query';
import _ from 'lodash';

export function AggTypesBucketsCreateFilterFiltersProvider() {
  return function (aggConfig, key) {
    // kibi: need to split the compound dbfilter query to remove the label
    // e.g. "8as7df7a89sdf - my query" -> "8as7df7a89sdf"
    key = key.split(' - ')[0];

    // have the aggConfig write agg dsl params
    const dslFilters = _.get(aggConfig.toDsl(), 'filters.filters');
    const filter = dslFilters[key];

    if (filter.dbfilter) {
      // kibi: modified to properly handle db_filter
      // Create the query filter objects with meta information
      const myQueryFilter = {
        meta: {
          index: aggConfig.vis.indexPattern.id,
          key: 'queries',
          value: key
        }
      };

      // Merge filter object with the query filter
      _.assign(myQueryFilter, filter);
      return myQueryFilter;
      // kibi: end
    } else if (filter) {
      return buildQueryFilter(filter.query, aggConfig.vis.indexPattern.id);
    }
  };
}
