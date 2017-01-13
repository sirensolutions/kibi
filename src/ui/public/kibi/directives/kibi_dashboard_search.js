import uiModules from 'ui/modules';
import { onDashboardPage } from 'ui/kibi/utils/on_page';
import 'ui/kibi/directives/kibi_dashboard_search.less';
import template from 'ui/kibi/directives/kibi_dashboard_search.html';

uiModules.get('app/dashboard')
.directive('kibiDashboardSearch', function ($rootScope) {
  return {
    restrict: 'E',
    template,
    link: function ($scope, $el) {
      $scope.$on('$routeChangeSuccess', function () {
        // check that it should be visible or not
        $scope.showSearch = onDashboardPage();
      });

      $scope.filterResults = function () {
        $rootScope.$emit('kibi:dashboard:invoke-method', 'filterResults');
      };

      $scope.$watch('state', function () {
        $rootScope.$emit('kibi:dashboard:set-property', 'state', $scope.state);
      }, true);

      const off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
        $scope[property] = value;
      });
      $scope.$on('$destroy', off);
    }
  };
});
