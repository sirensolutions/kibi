define(function (require) {
  const _ = require('lodash');
  const Promise = require('bluebird');

  return function DashboardHelperFactory(savedDashboards, savedSearches) {

    function DashboardHelper() {}

    DashboardHelper.prototype.getTimeDependentDashboards = function () {
      return savedDashboards.find()
      .then((savedDashboardsRes) => {
        let dashboards = _.filter(savedDashboardsRes.hits, (hit) => !!hit.savedSearchId);
        let promisses = _.map(dashboards, (dash) => {
          return savedSearches.get(dash.savedSearchId);
        });
        return Promise.all(promisses).then((savedSearchesRes) => {
          _.each(savedSearchesRes, (savedSearch) => {
            if (!savedSearch.searchSource.index().hasTimeField()) {
              _.remove(dashboards, 'savedSearchId', savedSearch.id);
            }
          });
          return dashboards;
        });
      });
    };

    return new DashboardHelper();
  };

});
