define(function (require) {
  // we need to load the css ourselves
  require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis.less');

  // we also need to load the controller and used by the template
  require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_params');

  // register the provider with the visTypes registry
  require('ui/registry/vis_types').register(KibiQueryViewerVisTypeProvider);

  function KibiQueryViewerVisTypeProvider(Private) {
    var TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'kibiqueryviewervis',
      title: 'Kibi query viewer',
      icon: 'fa-file-text',
      description: 'Your SQL/SPARQL queries results here (which can be parametric with the Kibi currently selected entity)',
      template: require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis.html'),
      params: {
        defaults: {
          queryDefinitions: []
        },
        editor: '<kibi-query-viewer-vis-params></kibi-query-viewer-vis-params>'
      },
      requiresSearch: false,
      version: 2
    });
  };

  return KibiQueryViewerVisTypeProvider;
});
