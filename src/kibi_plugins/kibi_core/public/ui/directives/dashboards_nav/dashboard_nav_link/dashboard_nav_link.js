import dashboardNavLinkTemplate from './dashboard_nav_link.html';
import './dashboard_nav_link.less';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardNavLink', kibiState => {
  const numeral = require('numeral')();

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      count: '=',
      countSpinner: '=',
      isPruned: '=',
      filterIconMessage: '=',
      classes: '@',
      showIcon: '=',
      isActive: '=',
      onClick: '&',
      iconUrl: '=',
      iconCss: '=',
      title: '='
    },
    template: dashboardNavLinkTemplate,
    link: function ($scope) {
      $scope.$watch('count', count => {
        delete $scope.countHumanNotation;
        if (count !== undefined) {
          $scope.countHumanNotation = numeral.set(count).format('0.[00]a');
          $scope.tooltipContent = `${$scope.title} (${count})`;
        } else {
          $scope.tooltipContent = $scope.title;
        }
      });

      $scope.isDashboardLoaded = Boolean(kibiState._getCurrentDashboardId());
      $scope.$watch(kibiState._getCurrentDashboardId, id => {
        $scope.isDashboardLoaded = Boolean(id);
      });
    }
  };
});
