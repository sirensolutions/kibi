import 'ui/kibi/directives/kibi_sync_time_to.less';
import _ from 'lodash';
import kibiTemplate from 'ui/kibi/directives/kibi_sync_time_to.html';
import kibanaTemplate from 'ui/kibi/directives/kibana_sync_time_to.html';
import uiModules from 'ui/modules';
import DashboardHelperProvider from 'ui/kibi/helpers/dashboard_helper';

uiModules
.get('ui/kibi/kibi_sync_time_to')
.directive('kibiSyncTimeTo', function (timefilter, $injector, Private, dashboardGroups) {
  const hasKibiState = $injector.has('kibiState');

  function linkWithKibiState($scope, $el, $attrs) {
    const kibiState = $injector.get('kibiState');
    const dashboardHelper = Private(DashboardHelperProvider);

    let currentDashId = kibiState._getCurrentDashboardId();
    const dashboardsFromState = kibiState.getSyncedDashboards(kibiState._getCurrentDashboardId());

    $scope.allSelected = false;
    $scope.dashboardGroups = [];
    // virtualGroups is used for displaying virtual groups as one group
    const virtualGroup = {
      title: 'Other',
      dashboards: []
    };

    $scope.tooltipOptions = { my: 'centerRight', at: 'leftCenter' };

    const createDashboardItem = function (dashboard) {
      const dashboardItem = {};
      dashboardItem.title = dashboard.title;
      dashboardItem.id =  dashboard.id;
      dashboardItem.selected = currentDashId === dashboard.id || _.contains(dashboardsFromState, dashboard.id);
      dashboardItem.disabled = currentDashId === dashboard.id;
      return dashboardItem;
    };

    const populateDashboards = function () {
      // reset the allSelected option
      $scope.allSelected = false;
      dashboardHelper.getTimeDependentDashboards().then((dashboards) => {

        _.each(dashboards, function (dashboard) {
          const dashboardGroupTitle = dashboardGroups.getTitlesOfDashboardGroupsTheseDashboardsBelongTo(new Array(dashboard.id));

          if (dashboardGroupTitle.length === 0) {
            virtualGroup.dashboards.push(createDashboardItem (dashboard));
          } else {
            const dashboardGroupIndex = _.findIndex($scope.dashboardGroups, function (dashboardGroup) {
              return dashboardGroup.title === dashboardGroupTitle[0];
            });
            if (dashboardGroupIndex !== -1) {
              $scope.dashboardGroups[dashboardGroupIndex].dashboards.push(createDashboardItem(dashboard));
            } else {
              const dashboardGroupItem = {
                title: dashboardGroupTitle[0],
                dashboards: [createDashboardItem(dashboard)]
              };
              $scope.dashboardGroups.push(dashboardGroupItem);
            }
          }
        });
        $scope.dashboardGroups =  _.sortBy($scope.dashboardGroups, 'title');
        virtualGroup.dashboards = _.sortBy(virtualGroup.dashboards, 'title');
        $scope.dashboardGroups = $scope.dashboardGroups.concat([virtualGroup]);
      });
    };

    $scope.$watch(function () {
      return kibiState._getCurrentDashboardId();
    }, function () {
      populateDashboards();
      currentDashId = kibiState._getCurrentDashboardId();
    });

    $scope.$watch('dashboards', function (dashboardGroups) {
      if (dashboardGroups) {
        for (let i = 0; i < dashboardGroups.length; i++) {
          for(let j = 0; j < dashboardGroups[i].dashboards.length; j++) {
            if (!dashboardGroups[i].dashboards[j].selected) {
              $scope.allSelected = false;
              return; // exit from function
            }
          }
        }
        $scope.allSelected = true;
      }
    }, true);

    $scope.selectAll = function () {
      _.each($scope.dashboardGroups, function (dashboardGroups) {
        _.each(dashboardGroups.dashboards, (d) => {
          if ($scope.allSelected) {
            d.selected = true;
          } else {
            if (!d.disabled) {
              d.selected = false;
            }
          }
        });
      });
    };

    const copyTimeToDashboards = function (dashboardGroups) {
      _.each(dashboardGroups, function (dashboardGroup) {
        _.each(dashboardGroup.dashboards, (d) => {
          if (d.selected) {
            kibiState._saveTimeForDashboardId(d.id, $scope.mode, timefilter.time.from, timefilter.time.to);
          }
        });
      });
    };

    $scope.syncTimeTo = function () {
      if ($scope.mode) {
        const syncFunctionName = 'apply' + _.capitalize($scope.mode);
        if ($scope[syncFunctionName]) {
          $scope[syncFunctionName]();
        }
      }
      copyTimeToDashboards($scope.dashboardGroups);

      let dashboards = [];

      _.each($scope.dashboardGroups, function (dashboardGroup) {
        const dashboardItem = _(dashboardGroup.dashboards)
        .filter('selected', true)
        .pluck('id')
        .value();
        if (dashboardItem.length > 0) {
          dashboards = dashboards.concat(dashboardItem);
        }
      });

      // unset previous synced dashboards
      _.each(kibiState.getSyncedDashboards(currentDashId), dashboardId => {
        kibiState.setSyncedDashboards(dashboardId);
      });
      kibiState.setSyncedDashboards(currentDashId);

      // set the new dashboards to sync
      if (dashboards.length > 0) {
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
