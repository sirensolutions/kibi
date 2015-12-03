define(function (require) {

  require('css!plugins/dashboard/directives/st_dashboard_toolbar/st_dashboard_toolbar.css');

  var app = require('modules').get('app/dashboard');

  app.directive('stDashboardToolbar', function ($compile, Notifier, savedDashboards, kbnUrl, Private, $rootScope) {

    return {
      restrict: 'E',
      //require: '^dashboardApp',
      // !!! does not inherits from dashboardApp because
      // we want to place it in different place
      template: require('text!plugins/dashboard/directives/st_dashboard_toolbar/st_dashboard_toolbar.html'),
      link: function ($scope, $el) {

        // here handle the calls and pass it to dashboard app
        $scope.newDashboard = function () {
          $rootScope.$emit('stDashboardInvokeMethod', 'newDashboard');
        };

        $scope.$watch('configTemplate', function () {
          $rootScope.$emit('stDashboardSetProperty', 'configTemplate', $scope.configTemplate);
        }, true);

        var off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
          $scope[property] = value;
        });
        $scope.$on('$destroy', off);
      }
    };
  });
});
