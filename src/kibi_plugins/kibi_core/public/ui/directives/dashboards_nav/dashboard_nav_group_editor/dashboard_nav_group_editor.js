import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups';
import 'plugins/kibi_core/ui/directives/icon_picker';
import 'plugins/kibi_core/ui/directives/icon_picker/icon_picker.less';
import dashboardNavGroupEditorTemplate from './dashboard_nav_group_editor.html';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import './dashboard_nav_group_editor.less';
import uiModules from 'ui/modules';
import _ from 'lodash';

uiModules
.get('kibana')
.directive('dashboardNavGroupEditor', ($rootScope, dashboardGroups,
  savedDashboardGroups, createNotifier, dashboardsNavState, Private) => {

  return {
    restrict: 'E',
    transclude: true,
    template: dashboardNavGroupEditorTemplate,
    link: function ($scope) {
      const cache = Private(CacheProvider);
      const notify = createNotifier({
        location: 'Dashboard Groups Editor'
      });
      $scope.dashboardGroup = {};

      $scope.setup = (id) => {
        savedDashboardGroups.get(id).then(newDashboardGroup => {
          $scope.dashboardGroup = newDashboardGroup;
          $scope.title = $scope.dashboardGroup.title;
        });
      };

      dashboardGroups.on('groupSelected', (group) => {
        $scope.setup(group.id);
      });

      $scope.cancel = () => {
        $scope.setup();
        dashboardsNavState.setGroupEditorOpen(false);
      };

      $scope.save = () => {
        $scope.dashboardGroup.save().then((groupId) => {
          Promise.all([cache.invalidate]).then(() => {
            notify.info('Dashboard Group ' + $scope.dashboardGroup.title + ' was successfuly saved');
            $scope.setup();
            dashboardsNavState.setGroupEditorOpen(false);
            $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
          })
          .catch (notify.error);
        });
      };

      $scope.setup();
    }
  };

});
