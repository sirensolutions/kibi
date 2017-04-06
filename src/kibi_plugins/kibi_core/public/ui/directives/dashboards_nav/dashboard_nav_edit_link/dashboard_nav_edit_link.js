import dashboardNavEditLinkTemplate from './dashboard_nav_edit_link.html';
import './dashboard_nav_edit_link.less';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardNavEditLink', (dashboardGroups, kibiState, dashboardsNavState) => {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      filter: '=',
      group: '='
    },
    template: dashboardNavEditLinkTemplate,
    link: function ($scope) {

      $scope.isOnEditMode = dashboardsNavState.isOnEditMode();
      $scope.$watch(dashboardsNavState.isOnEditMode, isOnEditMode => {
        $scope.isOnEditMode = isOnEditMode;
      });

      $scope.isGroupEditorOpen = dashboardsNavState.isGroupEditorOpen();
      $scope.$watch(dashboardsNavState.isGroupEditorOpen, isGroupEditorOpen => {
        $scope.isGroupEditorOpen = isGroupEditorOpen;
      });

      $scope.includeDashboardOnGroup = (event, group, dashboard) => {
        event.preventDefault();
        dashboardGroups.setDashboardSelection(group, dashboard);
      };

      $scope.editGroup = (event, group) => {
        event.preventDefault();
        dashboardGroups.setGroupSelection(group);
        dashboardsNavState.setGroupEditorOpen(true);
      };

      //TODO: Support drag-drop mechanisum

    }
  };
});
