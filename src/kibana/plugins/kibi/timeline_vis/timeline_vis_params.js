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

        $scope.$watch('vis.params.groups', function (groups) {

          _.each($scope.vis.params.groups, function (group) {
            if (!group.groupLabel) {
              group.groupLabel = group.savedSearchId;
            }
            savedSearches.get(group.savedSearchId).then(function (savedSearch) {
              group.indexPatternId = savedSearch.searchSource._state.index.id;
            });
          });
        }, true);
      }
    };
  });
});
