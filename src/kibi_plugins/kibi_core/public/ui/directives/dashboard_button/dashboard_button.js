import uiModules from 'ui/modules';
import 'plugins/kibi_core/ui/directives/dashboard_button/dashboard_button.less';

uiModules
.get('kibana')
.directive('kibiDashboardButton', function ($rootScope, chrome, appSwitcherEnsureNavigation, globalNavState, dashboardsNavState) {
  return {
    template: require('plugins/kibi_core/ui/directives/dashboard_button/dashboard_button.html'),
    transclude: true,
    restrict: 'E',
    link: ($scope) => {
      $scope.link = chrome.getNavLinks().filter(link => link.id === 'kibana:dashboard')[0];
      $scope.isDashboardNavToggled = !dashboardsNavState.isOpen();
      $scope.isGlobalNavOpen = globalNavState.isOpen();
      $scope.getTooltipContent = link => {
        if (globalNavState.isOpen()) {
          return link.tooltip;
        }
        return link.tooltip ? link.title + ' - ' + link.tooltip : link.title;
      };
      $scope.clickAction = ($event, link) => {
        if (!link.active) {
          appSwitcherEnsureNavigation($event, link);
        } else {
          $scope.toggleDashboardNav($event);
        }
      };
      $scope.getIndicatorClass = link => {
        return link.active ? 'kibi-dashboard-button-indicator' : '';
      };
      $scope.toggleDashboardNav = (event) => {
        event.preventDefault();
        dashboardsNavState.setOpen(!dashboardsNavState.isOpen());
      };
      $rootScope.$on('dashboardsNavState:change', () => {
        $scope.isDashboardNavToggled = !dashboardsNavState.isOpen();
      });
      $rootScope.$on('globalNavState:change', () => {
        $scope.isGlobalNavOpen = globalNavState.isOpen();
      });
    }
  };
});
