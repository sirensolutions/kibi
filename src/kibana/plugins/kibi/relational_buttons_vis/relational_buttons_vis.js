define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/kibi/relational_buttons_vis/relational_buttons_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/kibi/relational_buttons_vis/relational_buttons_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/kibi/relational_buttons_vis/relational_buttons_vis_params');

  return function KibiRelationalButtonsVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'sindicetech_relational',
      title: 'Kibi Relational filter',
      icon: 'fa-arrows-h',
      description: 'Relational widget displays buttons which allow user to switch between dashboards and preserve applied restrictions',
      template: require('text!plugins/kibi/relational_buttons_vis/relational_buttons_vis.html'),
      params: {
        defaults: {
          buttons: []
        },
        editor: '<kibi-relational-buttons-vis-params></kibi-relational-buttons-vis-params>'
      },
      requiresSearch: false
    });
  };
});
