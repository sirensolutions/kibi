define(function (require) {
  require('ui/modules')
  .get('app/visualize')
  .directive('visEditorSidebar', function () {
    var _ = require('lodash');

    require('plugins/kibana/visualize/editor/agg_group');
    require('plugins/kibana/visualize/editor/vis_options');

    return {
      restrict: 'E',
      template: require('plugins/kibana/visualize/editor/sidebar.html'),
      scope: true,
      controllerAs: 'sidebar',
      controller: function ($scope) {
        $scope.$bind('vis', 'editableVis');
        $scope.$bind('outputVis', 'vis');
        // kibi: set the default section in the visualisation configuration
        var defaultSection = _.get($scope, 'vis.type.defaultSection');
        if (defaultSection) {
          this.section = defaultSection;
        } else {
          this.section = _.get($scope, 'vis.type.requiresSearch') ? 'data' : 'options';
        }
        // kibi: end
      }
    };
  });
});
