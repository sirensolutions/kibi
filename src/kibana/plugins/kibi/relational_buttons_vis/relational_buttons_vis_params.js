define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/kibi_relational_buttons_vis')
  .directive('kibiRelationalButtonsVisParams', function ($window) {
    return {
      restrict: 'E',
      template: require('text!plugins/kibi/relational_buttons_vis/relational_buttons_vis_params.html')
    };
  });
});
