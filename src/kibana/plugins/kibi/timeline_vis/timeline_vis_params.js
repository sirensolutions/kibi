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


        var getUUID = function () {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };


        $scope.$watch('vis.params.groups', function (groups) {

          _.each($scope.vis.params.groups, function (group) {

            // we need unique ids to manage data series in timeline component
            if (!group.id) {
              group.id = getUUID();
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
