define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis_params');

  return function SindicetechEntityInfoVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'sindicetechentityinfo',
      title: 'Templated Query Viewer',
      icon: 'fa-file-text',
      description: 'Your SQL/SPARQL queries results here (which can be parametric with the Kibi currently selected entity)',
      template: require('text!plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis.html'),
      params: {
        defaults: {
          queryOptions: []
        },
        editor: '<sindicetech-entity-info-vis-params></sindicetech-entity-info-vis-params>'
      },
      requiresSearch: false
    });
  };
});
