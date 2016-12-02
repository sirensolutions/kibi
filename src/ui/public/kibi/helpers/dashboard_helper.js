define(function (require) {
  const _ = require('lodash');
  const Promise = require('bluebird');

  return function DashboardHelperFactory($timeout, kbnUrl, kibiState, savedDashboards, savedSearches) {

    function DashboardHelper() {}

    /**
     * getTimeDependentDashboards returns a list of dashboards which associated saved search is time-based.
     */
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

    /**
     * switchDashboard switches the view to the dashboard with the given ID
     */
    DashboardHelper.prototype.switchDashboard = function (dashboardId) {
      return kibiState.saveAppState()
      .then(() => {
        // switch dashboard in the next tick. If the state (e.g., appState) is being changed, this would
        // invalidate the state of the new dashboard
        return $timeout(() => {
          kbnUrl.change('/dashboard/{{id}}', {id: dashboardId});
        });
      });
    };

    return new DashboardHelper();
  };

});
