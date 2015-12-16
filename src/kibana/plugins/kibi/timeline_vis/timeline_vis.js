define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/kibi/timeline_vis/timeline_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/kibi/timeline_vis/timeline_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/kibi/timeline_vis/timeline_vis_params');

  return function (Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'timeline',
      title: 'Timeline widget',
      icon: 'fma-timeline',
      description: 'Timeline widget, displaying events from one or more saved searches',
      template: require('text!plugins/kibi/timeline_vis/timeline_vis.html'),
      params: {
        defaults: {
          groups: [],
          groupsOnSeparateLevels: false
        },
        editor: '<kibi-timeline-vis-params></kibi-timeline-vis-params>'
      },
      defaultSection: 'options',
      requiresSearch: false
    });
  };
});
