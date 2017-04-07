import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups';
import dashboardNavGroupEditorTemplate from './dashboard_nav_group_editor.html';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import './dashboard_nav_group_editor.less';
import uiModules from 'ui/modules';
import _ from 'lodash';

uiModules
.get('kibana')
.directive('dashboardNavGroupEditor', ($rootScope, $route, dashboardGroups,
  savedDashboardGroups, createNotifier, kibiState, dashboardsNavState, Private) => {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      editMode: '='
    },
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
          if (!$scope.editMode) {
            $scope.title = 'New Dashboard Group';
          } else {
            $scope.title = $scope.dashboardGroup.title;
          }
          $scope.dashboards = {};
          $scope.emptyGroups = {};
        });
      };

      dashboardGroups.on('dashboardSelected', (group, dashboard, state) => {
        if (!state) {
          delete $scope.dashboards[dashboard.id];
        } else {
          dashboard.group = group;
          $scope.dashboards[dashboard.id] = dashboard;
          if ($scope.groupIsEmpty(group)) {
            $scope.emptyGroups[group.id] = group;
          } else {
            delete $scope.emptyGroups[group.id];
          }
        }
      });

      $scope.groupIsEmpty = (group) => {
        if (group.virtual) {
          return false;
        }
        const selectCount = _.reduce(group.dashboards, (result, dashboard) => {
          return result + (dashboard.selected ? 1 : 0);
        }, 0);
        return group.dashboards.length === selectCount;
      };

      dashboardGroups.on('groupSelected', (group) => {
        $scope.setup(group.id);
      });

      $scope.dashboardsSelected = () => {
        return _.size($scope.dashboards);
      };

      $scope.cancel = () => {
        $scope.setup();
        dashboardsNavState.setGroupEditorOpen(false);
      };

      $scope.save = () => {
        const groups = {};
        if (!$scope.editMode) {
          $scope.dashboardGroup.dashboards = _.map($scope.dashboards, (dashboard) => {
            delete dashboard.selected;
            groups[dashboard.group.id] = dashboard.group;
            delete dashboard.group;
            return dashboard;
          });
        }

        $scope.dashboardGroup.save()
        .then((groupId) => {
          const postSaveActions = [];
          if (!$scope.editMode) {
            _.forEach($scope.emptyGroups, (group) => {
              postSaveActions.push(savedDashboardGroups.delete(group.id));
              delete groups[group.id];
            });
            _.forEach(groups, (group) => {
              if (group.virtual) {
                return;
              }
              postSaveActions.push(savedDashboardGroups.get(group.id).then((group) => {
                group.dashboards = _.filter(group.dashboards, (dashboard) => {
                  return _.reduce($scope.dashboards, (result, aDashboard) => {
                    return result + (aDashboard.id === dashboard.id ? 1 : 0);
                  }, 0) === 0;
                });
                return group;
              }).then((group) => {
                return group.save();
              }));
            });
          }
          postSaveActions.push(cache.invalidate);

          Promise.all(postSaveActions).then(() => {
            notify.info('Dashboard Group ' + $scope.dashboardGroup.title + ' was successfuly saved');
            $scope.setup();
            dashboardsNavState.setGroupEditorOpen(false);
            $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
          });
        });
      };

      $scope.setup();
    }
  };

});
