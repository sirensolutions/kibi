import './dashboard_switcher';
import './dashboards_nav.less';
import './dashboards_nav_control';
import dashboardsNavTemplate from './dashboards_nav.html';
import { onDashboardPage } from 'ui/kibi/utils/on_page';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardsNav', ($rootScope, dashboardsNavState, globalNavState) => {
  return {
    restrict: 'E',
    replace: true,
    scope: true,
    template: dashboardsNavTemplate,
    link: $scope => {
      function updateGlobalNav() {
        $scope.isGlobalNavOpen = globalNavState.isOpen();
      }

      function updateDashboardsNav() {
        const isOpen = dashboardsNavState.isOpen();
        $scope.isDashboardsNavOpen = isOpen;
        $scope.dashboardsNavToggleButton = {
          title: isOpen ? 'Collapse' : 'Expand',
          tooltipContent: isOpen ? 'Collapse dashboards bar' : 'Expand dashboards bar',
          icon: 'plugins/kibana/assets/play-circle.svg'
        };

        // Notify visualizations, e.g. the dashboard, that they should re-render.
        $rootScope.$broadcast('globalNav:update');
      }

      updateGlobalNav();
      updateDashboardsNav();

      $scope.toggleDashboardsNav = event => {
        event.preventDefault();
        dashboardsNavState.setOpen(!dashboardsNavState.isOpen());
      };

      $rootScope.$on('globalNavState:change', () => {
        updateGlobalNav();
      });

      $rootScope.$on('dashboardsNavState:change', () => {
        updateDashboardsNav();
      });

    }
  };
});
