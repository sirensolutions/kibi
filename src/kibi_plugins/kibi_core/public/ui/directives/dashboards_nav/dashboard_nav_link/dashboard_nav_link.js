import dashboardNavLinkTemplate from './dashboard_nav_link.html';
import './dashboard_nav_link.less';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardNavLink', kibiState => {
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
      tooltipContent: '=',
      onClick: '&',
      iconUrl: '=',
      iconCss: '=',
      title: '='
    },
    template: dashboardNavLinkTemplate,
    link: function ($scope) {
      $scope.isDashboardLoaded = Boolean(kibiState._getCurrentDashboardId());
      $scope.$watch(kibiState._getCurrentDashboardId, id => {
        $scope.isDashboardLoaded = Boolean(id);
      });
    }
  };
});
