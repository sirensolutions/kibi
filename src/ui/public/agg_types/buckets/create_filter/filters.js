define(function (require) {
  var buildQueryFilter = require('ui/filter_manager/lib/query');
  var _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      // have the aggConfig write agg dsl params
      var dslFilters = _.get(aggConfig.toDsl(), 'filters.filters');
      var filter = dslFilters[key];

      if (filter.dbfilter) {
        // kibi: modified to properly handle db_filter
        // Create the query filter objects with meta information
        var myQueryFilter = {
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
  };
});
