define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/sindicetech/sindicetechtable_vis/sindicetechtable_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/sindicetech/sindicetechtable_vis/sindicetechtable_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/sindicetech/sindicetechtable_vis/sindicetechtable_vis_params');
  require('components/doc_table/doc_table');

  return function SindicetechtableVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'sindicetechtable',
      title: 'Enhanced search results',
      icon: 'fa-th',
      description: 'Display search results - just like "searches" - but allows one to click and select a result. ' +
                   'In Kibi other components can listen and react to these selections.',
      template: require('text!plugins/sindicetech/sindicetechtable_vis/sindicetechtable_vis.html'),
      params: {
        defaults: {
          clickOptions: [],
          queryIds: []
        },
        editor: '<sindicetechtable-vis-params></sindicetechtable-vis-params>'
      },
      defaultSection: 'options'
    });
  };
});
