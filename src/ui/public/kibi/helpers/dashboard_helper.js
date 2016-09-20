define(function (require) {
  const _ = require('lodash');

  return function DashboardHelperFactory(savedDashboards, savedSearches) {

    function DashboardHelper() {}

    var filterDashboardsBasedOnSavedSearchId = function (dashboards, savedSearchId) {
      return _.filter(dashboards, (d) => {
        return d.savedSearchId === savedSearchId;
      });
    };

    var addToResults = function (a, dashboards) {
      _.each(dashboards, (dashCandidate) => {
        let found = _.find(a, (d) => {
          return dashCandidate.id === d.id;
        });
        if (!found) {
          a.push(dashCandidate);
        }
      });
    };

    DashboardHelper.prototype.getTimeDependentDashboards = function () {
      return savedDashboards.find()
      .then((savedDashboardsRes) => {
        let dashboards = _.filter(savedDashboardsRes.hits, (hit) => !!hit.savedSearchId);
        let promisses = _.map(dashboards, (dash) => {
          return savedSearches.get(dash.savedSearchId);
        });
        return Promise.all(promisses).then((savedSearchesRes) => {
          let ret = [];
          _.each(savedSearchesRes, (savedSearch) => {
            if (savedSearch.searchSource.index().hasTimeField()) {
              let dashboardSubset = filterDashboardsBasedOnSavedSearchId(dashboards, savedSearch.id);
              addToResults(ret, dashboardSubset);
            }
          });
          return ret;
        });
      });
    };

    return new DashboardHelper();
  };

});
