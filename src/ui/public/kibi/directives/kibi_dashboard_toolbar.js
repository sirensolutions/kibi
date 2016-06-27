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
