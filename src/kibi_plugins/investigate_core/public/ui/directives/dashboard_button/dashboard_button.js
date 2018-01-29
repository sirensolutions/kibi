import { uiModules } from 'ui/modules';
import 'plugins/investigate_core/ui/directives/dashboard_button/dashboard_button.less';
import template from 'plugins/investigate_core/ui/directives/dashboard_button/dashboard_button.html';

uiModules
.get('kibana')
.directive('kibiDashboardButton', function ($rootScope, $window, chrome, globalNavState, dashboardsNavState) {
  return {
    template,
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
          if (link.lastSubUrl) {
            $window.location.href = link.lastSubUrl;
          } else {
            $window.location.href = link.url;
          }
        } else {
          $scope.toggleDashboardNav($event);
        }
        // if it is 'status' page, reload the page
        if ($window.document.getElementsByClassName('kibi-es-diagnostics').length > 0) {
          $window.location.reload();
        };
        $event.stopPropagation();
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
