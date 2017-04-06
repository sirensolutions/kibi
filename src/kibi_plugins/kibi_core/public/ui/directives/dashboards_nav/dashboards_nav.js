import angular from 'angular';
import './dashboard_switcher';
import './dashboards_nav.less';
import './dashboards_nav_control';
import './dashboard_nav_group_editor';
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

        const onEditMode = dashboardsNavState.isOnEditMode();
        $scope.isDashboardsNavOnEditMode = onEditMode;

        const onGroupEditorOpen = dashboardsNavState.isGroupEditorOpen();
        $scope.isDashboardsNavGroupEditorOpen = onGroupEditorOpen;

        // Notify visualizations, e.g. the dashboard, that they should re-render.
        $rootScope.$broadcast('globalNav:update');

        const toaster = angular.element('.toaster-container .toaster');
        if (isOpen) {
          toaster
          .removeClass('dashboards-nav-closed')
          .addClass('dashboards-nav-open');
        } else {
          toaster
          .removeClass('dashboards-nav-open')
          .addClass('dashboards-nav-closed');
        }
      }

      updateGlobalNav();
      updateDashboardsNav();

      $scope.toggleDashboardsNav = event => {
        event.preventDefault();
        dashboardsNavState.setOpen(!dashboardsNavState.isOpen());
      };

      $scope.$on('$destroy', () => {
        angular.element('.toaster-container .toaster')
        .removeClass('dashboards-nav-open dashboards-nav-closed');
      });

      $scope.toggleDashboardsNavEditMode = event => {
        event.preventDefault();
        dashboardsNavState.setEditMode(!dashboardsNavState.isOnEditMode());
      };

      $scope.newDashboardGroup = event => {
        event.preventDefault();
        dashboardsNavState.setGroupEditorOpen(!dashboardsNavState.isGroupEditorOpen());
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
