import buildQueryFilter from 'ui/filter_manager/lib/query';
import _ from 'lodash';
export default function CreateFilterFiltersProvider() {
  return function (aggConfig, key) {
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
