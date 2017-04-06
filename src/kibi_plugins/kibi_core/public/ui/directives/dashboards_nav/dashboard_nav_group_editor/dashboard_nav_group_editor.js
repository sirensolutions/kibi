import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/_saved_dashboard_group';
import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups';
import dashboardNavGroupEditorTemplate from './dashboard_nav_group_editor.html';
import './dashboard_nav_group_editor.less';
import uiModules from 'ui/modules';
import _ from 'lodash';

uiModules
.get('kibana')
.directive('dashboardNavGroupEditor', ($rootScope, $route, dashboardGroups,
  savedDashboardGroups, createNotifier, kibiState, dashboardsNavState) => {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      editMode: '='
    },
    template: dashboardNavGroupEditorTemplate,
    link: function ($scope) {
      const notify = createNotifier({
        location: 'Dashboard Groups Editor'
      });
      $scope.dashboardGroup = {};

      $scope.setup = (id) => {
        savedDashboardGroups.get(id).then(newDashboardGroup => {
          $scope.dashboardGroup = newDashboardGroup;
          if (!$scope.editMode) {
            $scope.title = 'New Dashboard Group';
          } else {
            $scope.title = $scope.dashboardGroup.title;
          }
          $scope.dashboards = {};
        });
      };

      dashboardGroups.getEmitter().on('dashboardSelected', (group, dashboard) => {
        $scope.dashboards[dashboard.id] = dashboard;
      });

      dashboardGroups.getEmitter().on('groupSelected', (group) => {
        $scope.setup(group.id);
      });

      $scope.cancel = () => {
        $scope.setup();
        dashboardsNavState.setGroupEditorOpen(false);
      };

      $scope.save = () => {
        if (!$scope.editMode) {
          $scope.dashboardGroup.dashboards = _.map($scope.dashboards);
        }
        //TODO: After the save I need to remove the dashboard groups without any dashboard inside
        $scope.dashboardGroup.save()
        .then(function (groupId) {
          notify.info('Dashboard Group ' + $scope.dashboardGroup.title + ' was successfuly saved');
          $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
          $scope.setup();
          dashboardsNavState.setGroupEditorOpen(false);
        });
      };

      $scope.setup();
    }
  };

});
