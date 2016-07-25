define(function (require) {
  var _ = require('lodash');

  require('ui/kibi/directives/kibi_dashboard_search.less');

  var app = require('ui/modules').get('app/dashboard');

  app.directive('kibiDashboardSearch', function ($rootScope, Private) {
    var urlHelper = Private(require('ui/kibi/helpers/url_helper'));

    return {
      restrict: 'E',
      //require: '^dashboardApp', // kibi: does not inherits from dashboardApp because we want to place it in different place
      template: require('ui/kibi/directives/kibi_dashboard_search.html'),
      link: function ($scope, $el) {

        $scope.$on('$routeChangeSuccess', function () {
          // check that it should be visible or not
          $scope.showSearch = urlHelper.onDashboardTab();
        });

        $scope.filterResults = function () {
          $rootScope.$emit('kibi:dashboard:invoke-method', 'filterResults');
        };

        $scope.$watch('state', function () {
          $rootScope.$emit('kibi:dashboard:set-property', 'state', $scope.state);
        }, true);

        var off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
          $scope[property] = value;
        });
        $scope.$on('$destroy', off);

      }

    };
  });
});
