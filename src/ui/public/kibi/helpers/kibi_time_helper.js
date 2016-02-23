define(function (require) {
  var datemath = require('ui/utils/dateMath');

  return function KibiTimeHelperFactory($rootScope, Private, Promise, savedDashboards) {
    var _ = require('lodash');
    var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper'));

    /*
     * Helper class to obtain correct time filter per dashboard
     */
    function KibiTimeHelper() {
    }

    KibiTimeHelper.prototype.updateTimeFilterForDashboard = function (dashboardId, timeRangeF) {

      var updateTimeRangeFilter = function (dashboardBean, timeRangeFilter) {
        // check if timeRestore is set to true and only in this case try to modify the timeFilter
        if (dashboardBean && dashboardBean.timeRestore === true && dashboardBean.timeFrom && dashboardBean.timeTo) {
          // here take this values from kibiState
          // if there is no value in kibi state then it will already have correct time taken from global time
          var time = kibiStateHelper.getTimeForDashboardId(dashboardBean.id);
          if (time) {
            var from = datemath.parseWithPrecision(time.from, false, $rootScope.kibiTimePrecision).valueOf();
            var to = datemath.parseWithPrecision(time.to, false, $rootScope.kibiTimePrecision).valueOf();
            if (Object.keys(timeRangeFilter.range).length === 1) {
              timeRangeFilter.range[Object.keys(timeRangeFilter.range)[0]].gte = from;
              timeRangeFilter.range[Object.keys(timeRangeFilter.range)[0]].lte = to;
            }
          }
        }
      };

      var timeRangeFilter = _.cloneDeep(timeRangeF);

      // here use find as the results are already cached
      return savedDashboards.find().then(function (dashboardsResp) {
        var dashboardBean = _.find(dashboardsResp.hits, function (hit) {
          return hit.id === dashboardId;
        });
        if (dashboardBean === undefined) {
          return Promise.reject(new Error('Could not find a dashboard with id: ' + dashboardId));
        }

        updateTimeRangeFilter(dashboardBean, timeRangeFilter);
        return timeRangeFilter;
      });

    };

    return new KibiTimeHelper();
  };
});
