define(function (require) {

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules').get('kibana/kibi_kibi_sequential_join_vis')
  .directive('kibiSequentialJoinVisParams', function (config, Private) {

    return {
      restrict: 'E',
      template: require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_params.html'),
      link: function ($scope) {
      }
    };
  });
});
