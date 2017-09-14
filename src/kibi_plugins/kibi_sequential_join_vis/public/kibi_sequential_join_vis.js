import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
// we need to load the css ourselves
import 'plugins/kibi_sequential_join_vis/kibi_sequential_join_vis.less';
// we also need to load the controller and used by the template
import 'plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_controller';
// our params are a bit complex so we will manage them with a directive
import 'plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_params';
// register the provider with the visTypes registry
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import template from 'plugins/kibi_sequential_join_vis/kibi_sequential_join_vis.html';

VisTypesRegistryProvider.register(KibiSequentialJoinVisTypeProvider);

function KibiSequentialJoinVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'kibi_sequential_join_vis',
    title: 'Kibi Relational Filter',
    icon: 'fa-arrows-h',
    category: VisType.CATEGORY.KIBI,
    description: 'Relational widget displays buttons which allow user to switch between dashboards and preserve applied restrictions',
    template,
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

// export the provider so that the visType can be required with Private()
export default KibiSequentialJoinVisTypeProvider;
