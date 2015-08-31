define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetech_wordcloud_vis')
  .directive('sindicetechWordcloudVisParams', function () {
    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetech_wordcloud_vis/sindicetech_wordcloud_vis_params.html'),
      link: function ($scope) {
        $scope.$watchMulti([
          'vis.params.showPartialRows',
          'vis.params.showMeticsAtAllLevels'
        ], function () {
          if (!$scope.vis) return;

          var params = $scope.vis.params;
          if (params.showPartialRows || params.showMeticsAtAllLevels) {
            $scope.metricsAtAllLevels = true;
          } else {
            $scope.metricsAtAllLevels = false;
          }
        });
      }
    };
  });
});