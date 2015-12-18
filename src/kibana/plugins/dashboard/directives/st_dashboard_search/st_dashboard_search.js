define(function (require) {
  var _ = require('lodash');
  var app = require('modules').get('app/dashboard');

  app.directive('stDashboardSearch', function (Private, $rootScope, getAppState) {

    var urlHelper   = Private(require('components/kibi/url_helper/url_helper'));
    var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));

    return {
      restrict: 'E',
      //require: '^dashboardApp',
      // !!! does not inherits from dashboardApp because
      // we want to place it in different place
      template: require('text!plugins/dashboard/directives/st_dashboard_search/st_dashboard_search.html'),
      link: function ($scope, $el) {

        $scope.$on('$routeChangeSuccess', function () {
          // check that it should be visible or not
          $scope.showSearch = urlHelper.getCurrentDashboardId() ? true : false;
        });

        $scope.filterResults = function () {
          $rootScope.$emit('stDashboardInvokeMethod', 'filterResults');
        };

        $scope.removeAllFilters = function () {
          // remove all filters and queries acros dashboards
          // except pinned filters
          var appState = getAppState();
          var join_set_found = _.find(appState.filters, function (f) {
            return f.join_set;
          });

          appState.filters = [];
          appState.query = {query_string: {analyze_wildcard: true, query: '*'}};
          appState.save();

          kibiStateHelper.removeAllFilters();
          kibiStateHelper.removeAllQueries();

          // if join_set was deleted
          // emit event so others can react (kibiStateHelper, relationalPanel)
          if (join_set_found) {
            $rootScope.$emit('kibi:join_set:removed');
          }
        };

        $scope.$watch('state', function () {
          $rootScope.$emit('stDashboardSetProperty', 'state', $scope.state);
        }, true);

        var off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
          $scope[property] = value;
        });
        $scope.$on('$destroy', off);

      }

    };
  });
});
