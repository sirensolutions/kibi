import '../dashboard_nav_link/dashboard_nav_link';
import '../dashboards_nav_control/dashboards_nav_control';
import './dashboard_switcher.less';
import KibiNavBarHelperProvider from 'ui/kibi/directives/kibi_nav_bar_helper';
import QueryFilterProvider from 'ui/filter_bar/query_filter';
import template from './dashboard_switcher.html';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import _ from 'lodash';

uiRoutes
.addSetupWork(function (Private) {
  const kibiNavBarHelper = Private(KibiNavBarHelperProvider);
  return kibiNavBarHelper.init();
});

uiModules
.get('kibana')
.directive('dashboardSwitcher', function (kibiState, Private, $rootScope) {
  const kibiNavBarHelper = Private(KibiNavBarHelperProvider);
  const queryFilter = Private(QueryFilterProvider);

  return {
    restrict: 'E',
    scope: {
      filter: '=',
    },
    template,
    controller($scope) {
      const groups = kibiNavBarHelper.getDashboardGroups();

      $scope.groups = groups;

      $scope.$watch('filter', filter => {
        $scope.groups = groups;
        if (filter) {
          filter = filter.toLowerCase();
          $scope.groups = _.filter(groups, group => {
            if (_.contains(group.title.toLowerCase(), filter)) {
              return true;
            }
            return _.find(group.dashboards, dashboard => _.contains(dashboard.title.toLowerCase(), filter));
          });
        }
      });

      // rerender tabs if any dashboard got saved
      const removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
        kibiNavBarHelper.computeDashboardsGroups('Dashboard changed')
        .then(() => kibiNavBarHelper.updateAllCounts([ dashId ], 'kibi:dashboard:changed event'));
      });

      $scope.$watch(function (scope) {
        return kibiState._getCurrentDashboardId();
      }, (currentDashboardId) => {
        if (currentDashboardId) {
          kibiNavBarHelper.computeDashboardsGroups('current dashboard changed');
        }
      });

      const removeDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function () {
        kibiNavBarHelper.computeDashboardsGroups('Dashboard group changed');
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
        removeDashboardGroupChangedHandler();
        removeDashboardChangedHandler();
      });
    }
  };
});
