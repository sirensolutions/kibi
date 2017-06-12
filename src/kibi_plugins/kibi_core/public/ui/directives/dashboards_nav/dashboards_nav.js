import angular from 'angular';
import './dashboard_switcher';
import './dashboards_nav.less';
import './dashboards_nav_control';
import './dashboard_nav_group_editor';
import './dashboard_draggable/dashboard_draggable_container';
import './dashboard_draggable/dashboard_draggable_item';
import './dashboard_draggable/dashboard_draggable_handle';
import dashboardsNavTemplate from './dashboards_nav.html';
import { onDashboardPage } from 'ui/kibi/utils/on_page';
import { DashboardConstants } from 'src/core_plugins/kibana/public/dashboard/dashboard_constants';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardsNav', ($rootScope, dashboardsNavState, globalNavState, createNotifier, dashboardGroups) => {
  return {
    restrict: 'E',
    replace: true,
    scope: true,
    template: dashboardsNavTemplate,
    link: ($scope, $element) => {
      const notify = createNotifier({
        location: 'Dashboard Groups'
      });
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

      $scope.getCreateDashboardHref = function () {
        return `#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`;
      };

      $scope.toggleDashboardsNav = (event, force) => {
        if (!$scope.isDashboardsNavOnEditMode && (event.target === event.currentTarget || force)) {
          event.preventDefault();
          dashboardsNavState.setOpen(!dashboardsNavState.isOpen());
        }
      };

      $scope.$on('$destroy', () => {
        angular.element('.toaster-container .toaster')
        .removeClass('dashboards-nav-open dashboards-nav-closed');
      });

      $scope.toggleDashboardsNavEditMode = event => {
        event.preventDefault();
        dashboardsNavState.setEditMode(!dashboardsNavState.isOnEditMode());
        if (dashboardsNavState.isOnEditMode()) {
          $scope.oldFilter = $scope.dashboardFilter;
          $scope.dashboardFilter = '';
        } else {
          $scope.dashboardFilter = $scope.oldFilter;
        }
      };

      $scope.newDashboardGroup = event => {
        event.preventDefault();
        dashboardGroups.newGroup().then((groupId) => {
          notify.info('New dashboard group was successfuly created');
          $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
        })
        .catch (notify.error);
      };

      $rootScope.$on('globalNavState:change', () => {
        updateGlobalNav();
      });

      $rootScope.$on('dashboardsNavState:change', () => {
        updateDashboardsNav();
      });

      $scope.resize = () => {
        const $container = angular.element($element.find('.links')[0]);
        const $navControls = angular.element($element.find('.dashboards-nav-control')[0]);
        if ($navControls) {
          const h = $element.height() - $navControls.height() - 70;
          $container.height(Math.max(20, h));
        }
      };

      // Re-render if the window is resized
      angular.element(window).bind('resize', function () {
        $scope.resize();
      });

      $scope.resize();
    }
  };
});
