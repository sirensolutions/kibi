import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';

import './kibi_auto_join_vis.less';
import './kibi_auto_join_vis_controller';
import './kibi_auto_join_vis_params';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import template from './kibi_auto_join_vis.html';

function KibiAutoJoinVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  return new TemplateVisType({
    name: 'kibi_auto_join_vis',
    title: 'Automatic Relational Filter',
    icon: 'fa-arrows-h',
    category: VisType.CATEGORY.SIREN,
    description: 'Relational widget displays buttons which allow user to switch between dashboards and preserve applied restrictions',
    template,
    params: {
      defaults: {
        visibility: {}
      },
      editor: '<kibi-auto-join-vis-params></kibi-auto-join-vis-params>'
    },
    requiresMultiSearch: true,
    requiresSearch: false,
    version: 2
  });
};

VisTypesRegistryProvider.register(KibiAutoJoinVisTypeProvider);
export default KibiAutoJoinVisTypeProvider;
