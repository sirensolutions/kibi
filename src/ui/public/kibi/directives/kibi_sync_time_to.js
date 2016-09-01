define(function (require) {

  require('ui/kibi/directives/kibi_sync_time_to.less');

  var _ = require('lodash');
  var moment = require('moment');
  var module = require('ui/modules').get('ui/kibi/kibi_sync_time_to');

  module.directive('kibiSyncTimeTo', function (kibiState, savedDashboards, timefilter) {
    return {
      restrict: 'E',
      transclude: true,
      template: require('ui/kibi/directives/kibi_sync_time_to.html'),
      link: function ($scope, $el, $attrs) {

        $scope.allSelected = false;
        $scope.kibiFunction = $attrs.kibiFunction;
        var populateDashboards = function () {
          $scope.dashboards = [];
          var currentDashId = kibiState._getCurrentDashboardId();
          if (currentDashId) {
            $scope.dashboards.push({
              id: currentDashId,
              selected: true,
              disabled: true
            });
          }

          savedDashboards.find().then((res) => {
            _.each(res.hits, (hit) => {
              if (currentDashId !== hit.id) {
                $scope.dashboards.push({
                  id: hit.id,
                  selected: false,
                  disabled: false
                });
              }
            });
          });
        };


        $scope.$watch(function () {
          return kibiState._getCurrentDashboardId();
        }, function () {
          populateDashboards();
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

        var copyTimeToDashboards = function (dashboards) {
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
