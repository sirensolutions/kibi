define(function (require) {
  var _ = require('lodash');
  var vis = require('vis');

  require('modules').get('kibana/kibi/timeline_vis').directive('kibiTimelineVisParams', function ($rootScope, savedSearches) {

    return {
      restrict: 'E',
      template: require('text!plugins/kibi/timeline_vis/timeline_vis_params.html'),
      link: function ($scope, $element, attr) {

        // here deal with the parameters
        // Emit an event when state changes
        $scope.$watch('vis.dirty', function () {
          if ($scope.vis.dirty === false) {
            $rootScope.$emit('kibi:vis:state-changed');
          }
        });

        var _pickNextFreeId = function (takenIds) {
          // we start from 5000 to avoid confusion with index
          // index can not be used as user can move elements up and down
          // and if we use index that would affect colors
          if (takenIds.length === 0) {
            return 5000;
          }
          takenIds.sort();
          return takenIds[takenIds.length - 1] + 1;
        };

        $scope.$watch('vis.params.groups', function (groups) {

          var existingGroupIds = [];
          _.each($scope.vis.params.groups, function (group) {
            if (group.id) {
              existingGroupIds.push(group.id);
            }
          });
          _.each($scope.vis.params.groups, function (group) {

            // we need unique ids to manage data series in timeline component
            if (!group.id) {
              group.id = _pickNextFreeId(existingGroupIds);
            }

            if (!group.groupLabel) {
              group.groupLabel = group.savedSearchId;
            }
            if (group.savedSearchId) {
              savedSearches.get(group.savedSearchId).then(function (savedSearch) {
                group.indexPatternId = savedSearch.searchSource._state.index.id;
              });
            }
          });
        }, true);
      }
    };
  });
});
