define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/sindicetech/sindicetech_relational_vis/sindicetech_relational_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/sindicetech/sindicetech_relational_vis/sindicetech_relational_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/sindicetech/sindicetech_relational_vis/sindicetech_relational_vis_params');

  return function SindicetechRelationalVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'sindicetech_relational',
      title: 'Kibi Relational filter',
      icon: 'fa-arrows-h',
      description: 'Relational widget displays buttons which allow user to switch between dashboards and preserve applied restrictions',
      template: require('text!plugins/sindicetech/sindicetech_relational_vis/sindicetech_relational_vis.html'),
      params: {
        defaults: {
          buttons: []
        },
        editor: '<sindicetech-relational-vis-params></sindicetech-relational-vis-params>'
      },
      requiresSearch: false
    });
  };
});
