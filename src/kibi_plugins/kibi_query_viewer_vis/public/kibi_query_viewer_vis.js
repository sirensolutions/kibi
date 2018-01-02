import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
// we need to load the css ourselves
import 'plugins/kibi_query_viewer_vis/kibi_query_viewer_vis.less';
// we also need to load the controller and used by the template
import 'plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_controller';
// our params are a bit complex so we will manage them with a directive
import 'plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_params';
// register the provider with the visTypes registry
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import template from 'plugins/kibi_query_viewer_vis/kibi_query_viewer_vis.html';

function KibiQueryViewerVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'kibiqueryviewervis',
    title: 'Query Viewer',
    icon: 'fa-file-text',
    category: VisType.CATEGORY.SIREN,
    description: 'Your SQL/SPARQL queries results here (which can be parametric with the Kibi currently selected entity)',
    template,
    params: {
      defaults: {
        queryDefinitions: []
      },
      editor: '<kibi-query-viewer-vis-params></kibi-query-viewer-vis-params>'
    },
    requiresSearch: false,
    version: 2
  });
}

VisTypesRegistryProvider.register(KibiQueryViewerVisTypeProvider);

// export the provider so that the visType can be required with Private()
export default KibiQueryViewerVisTypeProvider;
