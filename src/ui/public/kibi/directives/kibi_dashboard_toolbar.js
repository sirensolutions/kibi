define(function (require) {

  require('ui/kibi/directives/kibi_dashboard_toolbar.less');

  var _ = require('lodash');
  var app = require('ui/modules').get('app/dashboard');

  app.directive('kibiDashboardToolbar', function (kibiState, $rootScope) {
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
          kibiState.resetFiltersQueriesTimes();
        };

        $scope.relationalFilterPanelOpened = false;

        $scope.openRelationalFilterPanel = function () {
          $scope.relationalFilterPanelOpened = !$scope.relationalFilterPanelOpened;
          $rootScope.$emit('relationalFilterPanelOpened', $scope.relationalFilterPanelOpened);
        };

        var removeRelationalFilterPanelClosedHandler = $rootScope.$on('relationalFilterPanelClosed', function () {
          $scope.relationalFilterPanelOpened = false;
        });

        // close panel when user navigates to a different route
        var removeRouteChangeSuccessHandler = $rootScope.$on('$routeChangeSuccess', function (event, next, prev, err) {
          if (!next.locals.dash) {
            // only if we switched to a non dashboard page
            $rootScope.$emit('relationalFilterPanelOpened', false);
            $scope.relationalFilterPanelOpened = false;
          }
        });

        $scope.$watch('configTemplate', function () {
          $rootScope.$emit('kibi:dashboard:set-property', 'configTemplate', $scope.configTemplate);
        }, true);

        var off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
          $scope[property] = value;
        });
        $scope.$on('$destroy', function () {
          removeRouteChangeSuccessHandler();
          removeRelationalFilterPanelClosedHandler();
        });
      }
    };
  });
});
