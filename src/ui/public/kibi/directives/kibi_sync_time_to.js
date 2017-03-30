import 'ui/kibi/directives/kibi_sync_time_to.less';
import _ from 'lodash';
import moment from 'moment';
import kibiTemplate from 'ui/kibi/directives/kibi_sync_time_to.html';
import kibanaTemplate from 'ui/kibi/directives/kibana_sync_time_to.html';
import uiModules from 'ui/modules';
import DashboardHelperProvider from 'ui/kibi/helpers/dashboard_helper';

uiModules
.get('ui/kibi/kibi_sync_time_to')
.directive('kibiSyncTimeTo', function ($injector, Private) {
  const hasKibiState = $injector.has('kibiState');

  function linkWithKibiState($scope, $el, $attrs) {
    const kibiState = $injector.get('kibiState');
    const dashboardHelper = Private(DashboardHelperProvider);

    let currentDashId = kibiState._getCurrentDashboardId();

    $scope.allSelected = false;

    const populateDashboards = function () {
      // reset the allSelected option
      $scope.allSelected = false;
      dashboardHelper.getTimeDependentDashboards().then((dashboards) => {
        const dashboardsFromState = kibiState.getSyncedDashboards(kibiState._getCurrentDashboardId());

        $scope.dashboards = _.map(dashboards, (d) => {
          return {
            title: d.title,
            id: d.id,
            selected: currentDashId === d.id || _.contains(dashboardsFromState, d.id),
            disabled: currentDashId === d.id
          };
        });
      });
    };

    $scope.orderByTitle = function (dashboard) {
      // the current dashboard appears on top
      if (currentDashId === dashboard.id) {
        return '';
      }
      return dashboard.title;
    };

    $scope.$watch(function () {
      return kibiState._getCurrentDashboardId();
    }, function () {
      populateDashboards();
      currentDashId = kibiState._getCurrentDashboardId();
    });

    $scope.$watch('dashboards', function (dashboards) {
      if (dashboards) {
        for (let i = 0; i < dashboards.length; i++) {
          if (!dashboards[i].selected) {
            $scope.allSelected = false;
            return; // exit from function
          }
        }
        $scope.allSelected = true;
      }
    }, true);

    $scope.selectAll = function () {
      _.each($scope.dashboards, (d) => {
        if ($scope.allSelected) {
          d.selected = true;
        } else {
          if (!d.disabled) {
            d.selected = false;
          }
        }
      });
    };

    const copyTimeToDashboards = function (dashboards) {
      _.each(dashboards, (d) => {
        if (d.selected) {
          kibiState._saveTimeForDashboardId(d.id, $scope.mode, $scope.from, $scope.to);
        }
      });
    };

    $scope.syncTimeTo = function () {
      if ($scope.mode) {
        const syncFunctionName = 'apply' + _.capitalize($scope.mode);
        if ($scope[syncFunctionName]) {
          $scope[syncFunctionName]();
        }
      }
      copyTimeToDashboards($scope.dashboards);

      const dashboards = _($scope.dashboards)
      .filter('selected', true)
      .pluck('id')
      .value();

      // unset previous synced dashboards
      _.each(kibiState.getSyncedDashboards(currentDashId), dashboardId => {
        kibiState.setSyncedDashboards(dashboardId);
      });
      kibiState.setSyncedDashboards(currentDashId);

      // set the new dashboards to sync
      if (dashboards.length > 1) {
        _.each(dashboards, dashboardId => {
          kibiState.setSyncedDashboards(dashboardId, _.without(dashboards, dashboardId));
        });
      }

      kibiState.save();
    };

  }

  return {
    restrict: 'E',
    transclude: true,
    template: hasKibiState ? kibiTemplate : kibanaTemplate,
    link: hasKibiState ? linkWithKibiState : _.noop
  };
});
