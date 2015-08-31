define(function (require) {
  // var buildQueryFilter = require('components/filter_manager/lib/query');
  var _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      // have the aggConfig write agg dsl params
      var dslFilters = _.deepGet(aggConfig.toDsl(), 'filters.filters');
      var filter = dslFilters[key];

      if (filter) {
        // Modified by SindiceTech
        // return buildQueryFilter(filter, aggConfig.vis.indexPattern.id);

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
      }
    };
  };
});
