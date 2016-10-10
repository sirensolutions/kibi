define(function (require) {

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules').get('kibana/kibi_kibi_sequential_join_vis')
  .directive('kibiSequentialJoinVisParams', function (config, Private) {

    var relationsHelper = Private(require('ui/kibi/helpers/relations_helper'));

    return {
      restrict: 'E',
      template: require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_params.html'),
      link: function ($scope) {
        var dashboardRelations = config.get('kibi:relations').relationsDashboards;

        var filterDashboardBasedOnOtherOne = function (firstDashValue, secondDashValue) {
          var i;
          if (secondDashValue) {
            if (firstDashValue === secondDashValue) {
              // check if there is a self join relation if yes do not filter this one out
              for (i = 0; i < dashboardRelations.length; i++) {
                if (dashboardRelations[i].dashboards[0] === firstDashValue &&
                    dashboardRelations[i].dashboards[1] === firstDashValue
                ) {
                  return false;
                }
              }
            } else {
              // check if item.value is connected to options.sourceDashboardId
              for (i = 0; i < dashboardRelations.length; i++) {
                if (
                  (
                    dashboardRelations[i].dashboards[0] === firstDashValue &&
                    dashboardRelations[i].dashboards[1] === secondDashValue
                  )
                  ||
                  (
                    dashboardRelations[i].dashboards[1] === firstDashValue &&
                    dashboardRelations[i].dashboards[0] === secondDashValue
                  )
                ) {
                  return false;
                }
              }
            }
          }
          // no second dashboard value to compare with
          if (!secondDashValue) {
            for (i = 0; i < dashboardRelations.length; i++) {
              if (dashboardRelations[i].dashboards.indexOf(firstDashValue) !== -1) {
                return false;
              }
            };
          }
          return true;
        };

        $scope.filterSourceDashboards = function (item, options, wasItTheSelectedOne) {
          if (!item) {
            // do not filter
            return false;
          }
          return filterDashboardBasedOnOtherOne(item.value, options.targetDashboardId);
        };

        $scope.filterTargetDashboards = function (item, options, wasItTheSelectedOne) {
          if (!item) {
            // do not filter
            return false;
          }
          return filterDashboardBasedOnOtherOne(item.value, options.sourceDashboardId);
        };
      }
    };
  });
});
