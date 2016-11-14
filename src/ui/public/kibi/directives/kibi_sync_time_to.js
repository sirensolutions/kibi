define(function (require) {

  require('ui/kibi/directives/kibi_sync_time_to.less');

  const _ = require('lodash');
  const moment = require('moment');
  const module = require('ui/modules').get('ui/kibi/kibi_sync_time_to');

  module.directive('kibiSyncTimeTo', function (kibiState, Private) {
    const dashboardHelper = Private(require('ui/kibi/helpers/dashboard_helper'));

    return {
      restrict: 'E',
      transclude: true,
      template: require('ui/kibi/directives/kibi_sync_time_to.html'),
      link: function ($scope, $el, $attrs) {
        let currentDashId = kibiState._getCurrentDashboardId();

        $scope.allSelected = false;
        $scope.kibiFunction = $attrs.kibiFunction;

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
          if ($scope[$attrs.kibiFunction]) {
            $scope[$attrs.kibiFunction]();
          }
          copyTimeToDashboards($scope.dashboards);

          const dashboards = _($scope.dashboards)
          .filter('selected', true)
          .pluck('id')
          .value();

          if (dashboards.length > 1) {
            _.each(dashboards, dashboardId => {
              kibiState.setSyncedDashboards(dashboardId, _.without(dashboards, dashboardId));
            });
          } else {
            _.each(kibiState.getSyncedDashboards(currentDashId), dashboardId => {
              kibiState.setSyncedDashboards(dashboardId);
            });
            kibiState.setSyncedDashboards(currentDashId);
          }

          kibiState.save();
        };

      }
    };
  });
});
