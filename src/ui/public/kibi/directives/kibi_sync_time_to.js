define(function (require) {

  require('ui/kibi/directives/kibi_sync_time_to.less');

  const _ = require('lodash');
  const moment = require('moment');
  const module = require('ui/modules').get('ui/kibi/kibi_sync_time_to');

  module.directive('kibiSyncTimeTo', function (kibiState, timefilter, Private) {

    var dashboardHelper = Private(require('ui/kibi/helpers/dashboard_helper'));

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
            $scope.dashboards = _.map(dashboards, (d) => {
              return {
                title: d.title,
                id: d.id,
                selected: currentDashId === d.id,
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
          kibiState.save();
        };

        $scope.syncTimeTo = function () {
          if ($scope[$attrs.kibiFunction]) {
            $scope[$attrs.kibiFunction]();
          }
          copyTimeToDashboards($scope.dashboards);
        };

      }
    };
  });
});
