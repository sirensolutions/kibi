import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import dashboardNavEditLinkTemplate from './dashboard_nav_edit_link.html';
import './dashboard_nav_edit_link.less';
import uiModules from 'ui/modules';
import _ from 'lodash';

uiModules
.get('kibana')
.directive('dashboardNavEditLink', ($rootScope, $timeout, dashboardGroups, kibiState, createNotifier,
  dashboardsNavState, savedDashboardGroups, Private) => {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      filter: '=',
      group: '='
    },
    template: dashboardNavEditLinkTemplate,
    link: function ($scope) {
      const cache = Private(CacheProvider);
      const notify = createNotifier({
        location: 'Dashboard Groups Editor'
      });
      $scope.isOnEditMode = dashboardsNavState.isOnEditMode();
      $scope.$watch(dashboardsNavState.isOnEditMode, isOnEditMode => {
        $scope.isOnEditMode = isOnEditMode;
      });

      $scope.isGroupEditorOpen = dashboardsNavState.isGroupEditorOpen();
      $scope.$watch(dashboardsNavState.isGroupEditorOpen, isGroupEditorOpen => {
        if (isGroupEditorOpen) {
          $scope.group.dashboards.forEach(dashboard => {
            dashboard.selected = false;
          });
        }
        $scope.isGroupEditorOpen = isGroupEditorOpen;
      });

      $scope.includeDashboardOnGroup = (event, group, dashboard) => {
        dashboard.selected = event.target.checked;
        dashboardGroups.setDashboardSelection(group, dashboard, dashboard.selected);
      };

      $scope.editGroup = (event, group) => {
        event.preventDefault();
        dashboardGroups.setGroupSelection(group);
        dashboardsNavState.setGroupEditorOpen(true);
      };

      $scope.deleteGroup = () => {
        const group = $scope.group;
        savedDashboardGroups.delete(group.id)
        .then(cache.invalidate)
        .then(() => {
          notify.info('Dashboard Group ' + group.title + ' was successfuly deleted');
          $rootScope.$emit('kibi:dashboardgroup:changed', group.id);
        });
      };

      $scope.groupIsEmpty = () => {
        if ($scope.isOnEditMode) {
          return;
        }
        const selectCount = _.reduce($scope.group.dashboards, (result, dashboard) => {
          return result + (dashboard.selected ? 1 : 0);
        }, 0);
        return $scope.group.dashboards.length === selectCount;
      };
    }
  };
});
