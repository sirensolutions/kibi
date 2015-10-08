define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetech_relational_vis')
  .directive('sindicetechRelationalVisParams', function ($window) {
    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetech_relational_vis/sindicetech_relational_vis_params.html')
    };
  });
});
