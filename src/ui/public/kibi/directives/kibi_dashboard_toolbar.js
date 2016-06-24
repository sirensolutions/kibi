define(function (require) {

  require('ui/kibi/directives/kibi_dashboard_toolbar.less');

  var _ = require('lodash');
  var app = require('ui/modules').get('app/dashboard');

  app.directive('kibiDashboardToolbar', function (kibiState, config, timefilter, savedDashboards, getAppState, Private, $rootScope) {

    var kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));

    return {
      restrict: 'E',
      //require: '^dashboardApp', // kibi: does not inherits from dashboardApp because we want to place it in different place
      template: require('ui/kibi/directives/kibi_dashboard_toolbar.html'),
      link: function ($scope, $el) {

        // here handle the calls and pass it to dashboard app
        $scope.newDashboard = function () {
          $rootScope.$emit('kibi:dashboard:invoke-method', 'newDashboard');
        };

        $scope.resetFiltersQueriesTimes = function () {
          // remove all filters and queries across dashboards
          // except pinned filters
          const resetAppState = savedDashboards.find().then((resp) => {
            if (resp.hits) {
              var appState = getAppState();
              _.each(resp.hits, (dashboard) => {
                if (dashboard.id === appState.id) {
                  const meta = JSON.parse(dashboard.kibanaSavedObjectMeta.searchSourceJSON);
                  // filters
                  appState.filters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
                  // query
                  const query = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
                  appState.query = query && query.query || {query_string: {analyze_wildcard: true, query: '*'}};
                  // time
                  if (dashboard.timeRestore && dashboard.timeFrom && dashboard.timeTo) {
                    timefilter.time.mode = dashboard.timeMode;
                    timefilter.time.to = dashboard.timeTo;
                    timefilter.time.from = dashboard.timeFrom;
                  } else {
                    var timeDefaults = config.get('timepicker:timeDefaults');
                    // These can be date math strings or moments.
                    timefilter.time = timeDefaults;
                  }
                  return false;
                }
              });
              appState.save();
            }
          });

          Promise.all([ resetAppState, kibiStateHelper.resetFiltersQueriesTimes() ])
          .then(() => {
            kibiState.disableAllRelations();
            kibiState.save();
          });
        };

        $scope.$watch('configTemplate', function () {
          $rootScope.$emit('kibi:dashboard:set-property', 'configTemplate', $scope.configTemplate);
        }, true);

        var off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
          $scope[property] = value;
        });
        $scope.$on('$destroy', off);
      }
    };
  });
});
