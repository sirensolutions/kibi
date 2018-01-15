import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';

import './siren_auto_join_vis.less';
import './siren_auto_join_vis_controller';
import './siren_auto_join_vis_params';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import template from './siren_auto_join_vis.html';

function SirenAutoJoinVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  return new TemplateVisType({
    name: 'siren_auto_join_vis',
    title: 'Automatic Relational Filter',
    icon: 'fa-arrows-h',
    category: VisType.CATEGORY.SIREN,
    description: 'Relational widget displays buttons which allow user to switch between dashboards and preserve applied restrictions',
    template,
    params: {
      defaults: {
        layout: 'normal',
        visibility: {}
      },
      editor: '<siren-auto-join-vis-params></siren-auto-join-vis-params>'
    },
    requiresMultiSearch: true,
    requiresSearch: false,
    version: 2
  });
};

VisTypesRegistryProvider.register(SirenAutoJoinVisTypeProvider);
export default SirenAutoJoinVisTypeProvider;
