import '../dashboard_nav_edit_link/dashboard_nav_edit_link';
import './dashboard_switcher.less';
import KibiNavBarHelperProvider from 'ui/kibi/directives/kibi_nav_bar_helper';
import QueryFilterProvider from 'ui/filter_bar/query_filter';
import template from './dashboard_switcher.html';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import _ from 'lodash';
import MissingDashboardError from 'ui/kibi/errors/missing_dashboard_error';
import { DashboardConstants } from 'src/core_plugins/kibana/public/dashboard/dashboard_constants';

uiModules
.get('kibana')
.directive('dashboardSwitcher', function (dashboardGroups, dashboardsNavState, createNotifier, kibiState,
  Private, $rootScope, globalNavState, kbnUrl, $timeout) {
  const kibiNavBarHelper = Private(KibiNavBarHelperProvider);
  const queryFilter = Private(QueryFilterProvider);
  const notify = createNotifier({
    location: 'Dashboard Navigation Bar'
  });

  return {
    restrict: 'E',
    scope: {
      filter: '=',
    },
    template,
    controller($scope, $element) {
      $scope.$on('kibi-dashboard-nav-saving', (event, value) => {
        $scope.isSaving = value;
        if ($scope.isSaving) {
          $timeout(() => {
            $scope.isSaving = false;
          }, 5000);
        }
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }
      });

      $scope.persistCollapsedGroupState = () => {
        const collapsedGroups = [];
        $scope.groups.forEach(group => {
          if (!group.virtual && group.collapsed) {
            collapsedGroups.push(group.id);
          }
        });
        dashboardsNavState.setCollapsedGroups(collapsedGroups);
      };

      $scope.restoreCollapsedGroupState = () => {
        const collapsedGroups = dashboardsNavState.collapsedGroups();
        $scope.groups.forEach(group => {
          if (_.indexOf(collapsedGroups, group.id) >= 0) {
            group.collapsed = true;
          }
        });
      };

      $scope.$watch(kibiState._getCurrentDashboardId, id => {
        if (id && dashboardGroups.isInitialized) {
          dashboardGroups.getGroups().forEach(group => {
            group.dashboards.forEach(dash => dash.$$highlight = false);
          });
          const group = dashboardGroups.getGroup(id);
          group.collapsed = false;
          $scope.persistCollapsedGroupState();
          const dashboardIds = _(group.dashboards).filter(d => !d.count).map('id').value();
          if (dashboardIds.length > 0) {
            dashboardGroups.updateMetadataOfDashboardIds(dashboardIds);
          }
        }
      });

      $scope.groups = dashboardGroups.getGroups();
      $scope.$watchCollection(() => dashboardGroups.getGroups(), function (groups) {
        if (groups) {
          $scope.persistCollapsedGroupState();
          dashboardGroups.setActiveGroupFromUrl();
          $scope.groups = dashboardGroups.getGroups();
          $scope.restoreCollapsedGroupState();
          $scope.$emit('kibi:dashboardGroups:updated');
        }
      });

      $scope.isGroupEditorOpen = dashboardsNavState.isGroupEditorOpen();
      $scope.$watch(dashboardsNavState.isGroupEditorOpen, isGroupEditorOpen => {
        $scope.isGroupEditorOpen = isGroupEditorOpen;
      });

      const computeDashboardsGroups = (reason, action = '', forceUpdate = false) => {
        if (!forceUpdate) {
          $scope.persistCollapsedGroupState();
        }
        const groupsPromise = dashboardGroups.computeGroups(reason);
        const metadataPromise = groupsPromise.then(groups => {
          $scope.groups = _.cloneDeep(groups);
          if (!forceUpdate) {
            $scope.restoreCollapsedGroupState();
          }
          const dashboardIds = _($scope.groups)
          .filter(g => (forceUpdate || !g.collapsed) || g.virtual)
          .map('dashboards')
          .flatten()
          .map('id')
          .value();
          return dashboardGroups.updateMetadataOfDashboardIds(dashboardIds);
        });

        return Promise.all([ groupsPromise, metadataPromise ])
        .then(() => {
          $timeout(() => {
            if (action === 'selectDashboard') {
              kbnUrl.change(DashboardConstants.LANDING_PAGE_PATH);
            }
          }, 1000);
        })
        .catch((err) => {
          // ignore all missing dashboard errors as user might not have permissions to see them
          if (!(err instanceof MissingDashboardError)) {
            notify.error(err);
          }
        });
      };

      // rerender tabs if any dashboard got saved
      const removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', (event, dashId) => {
        computeDashboardsGroups('Dashboard changed')
        .then(() => kibiNavBarHelper.updateAllCounts([ dashId ], 'kibi:dashboard:changed event'));
      });

      $scope.$on('kibi:dashboardgroup:changed', () => {
        computeDashboardsGroups('Dashboard group changed');
      });

      $scope.$on('kibi:dashboardgroup:deletedashboard', () => {
        computeDashboardsGroups('Dashboard group changed', 'selectDashboard');
      });

      // this controller will receive x event calls one per dashboard, so, we need to debounce the calls.
      $scope.refreshCount = _.debounce(() => {
        computeDashboardsGroups('Refresh counts', 'refresh', true);
      }, 5000, { leading: true, trailing: false });

      $scope.$on('kibi:dashboardgroup:reloadcounts', () => {
        $scope.refreshCount();
      });

      $scope.$listen(queryFilter, 'update', function () {
        const currentDashboardId = kibiState._getCurrentDashboardId();
        if (currentDashboardId) {
          const dashboardIds = kibiState.addAllConnected(currentDashboardId);
          kibiNavBarHelper.updateAllCounts(dashboardIds, 'filters change');
        }
      });

      $scope.$on('$destroy', function () {
        kibiNavBarHelper.cancelExecutionInProgress();
        removeDashboardChangedHandler();
      });
    }
  };
})
.filter('kibiGroupFilter', () => {
  return (input, filter) => {
    if (!filter) {
      return input;
    }
    const filtered = [];
    const exp = new RegExp(filter, 'i');
    input.forEach(group => {
      if (!filter || !group.virtual || (filter && group.virtual && group.title.search(exp) !== -1)) {
        filtered.push(group);
      }
    });
    return filtered;
  };
});
