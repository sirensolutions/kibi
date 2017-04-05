import '../dashboard_nav_link/dashboard_nav_link';
import '../dashboards_nav_control/dashboards_nav_control';
import './dashboard_switcher.less';
import KibiNavBarHelperProvider from 'ui/kibi/directives/kibi_nav_bar_helper';
import QueryFilterProvider from 'ui/filter_bar/query_filter';
import template from './dashboard_switcher.html';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import _ from 'lodash';

uiModules
.get('kibana')
.directive('dashboardSwitcher', function (dashboardGroups, createNotifier, kibiState, Private, $rootScope) {
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
    controller($scope) {
      $scope.groups = dashboardGroups.getGroups();
      $scope.$watchCollection(() => dashboardGroups.getGroups(), function (groups) {
        if (groups) {
          dashboardGroups.setActiveGroupFromUrl();
          $scope.groups = dashboardGroups.getGroups();
        }
      });

      $scope.$watch(() => kibiState._getCurrentDashboardId(), currentDashboardId => {
        if (currentDashboardId) {
          dashboardGroups.setActiveGroupFromUrl();
          $scope.groups = dashboardGroups.getGroups();
        }
      });

      const computeDashboardsGroups = function (reason) {
        return dashboardGroups.computeGroups(reason)
        .then((groups) => {
          dashboardGroups.copy(groups, $scope.groups);
        })
        .catch((err) => {
          // ignore all missing dashboard errors as user might not have permissions to see them
          if (!(err instanceof MissingDashboardError)) {
            notify.warning(err);
          }
        });
      };

      // rerender tabs if any dashboard got saved
      const removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
        computeDashboardsGroups('Dashboard changed')
        .then(() => kibiNavBarHelper.updateAllCounts([ dashId ], 'kibi:dashboard:changed event'));
      });

      $rootScope.$on('kibi:dashboardgroup:changed', function () {
        computeDashboardsGroups('Dashboard group changed');
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
});
