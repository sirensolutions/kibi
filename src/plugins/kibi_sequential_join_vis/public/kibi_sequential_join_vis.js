define(function (require) {
  // we need to load the css ourselves
  require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis.less');

  // we also need to load the controller and used by the template
  require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_params');

  // register the provider with the visTypes registry
  require('ui/registry/vis_types').register(KibiSequentialJoinVisTypeProvider);

  function KibiSequentialJoinVisTypeProvider(Private) {
    var TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'kibi_sequential_join_vis',
      title: 'Kibi relational filter',
      icon: 'fa-arrows-h',
      description: 'Relational widget displays buttons which allow user to switch between dashboards and preserve applied restrictions',
      template: require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis.html'),
      params: {
        defaults: {
          buttons: []
        },
        editor: '<kibi-sequential-join-vis-params></kibi-sequential-join-vis-params>'
      },
      requiresMultiSearch: true,
      requiresSearch: false,
      version: 2
    });
  }

  return KibiSequentialJoinVisTypeProvider;
});
