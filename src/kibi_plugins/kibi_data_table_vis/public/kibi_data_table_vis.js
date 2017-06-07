import VisVisTypeProvider from 'ui/vis/vis_type';
import templateVisTypeProvider from 'ui/template_vis_type/template_vis_type';
// we need to load the css ourselves
import 'plugins/kibi_data_table_vis/kibi_data_table_vis.less';
// we also need to load the controller and used by the template
import 'plugins/kibi_data_table_vis/kibi_data_table_vis_controller';
// our params are a bit complex so we will manage them with a directive
import 'plugins/kibi_data_table_vis/kibi_data_table_vis_params';
// register the provider with the visTypes registry
import registry from 'ui/registry/vis_types';
import _ from 'lodash';
import template from 'plugins/kibi_data_table_vis/kibi_data_table_vis.html';
import 'plugins/kibi_data_table_vis/custom_view/kibi_custom_view';
import 'plugins/kibi_data_table_vis/custom_view/kibi_table_sorting';

registry.register(KibiDataTableVisTypeProvider);

function KibiDataTableVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(templateVisTypeProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'kibi-data-table',
    title: 'Kibi Enhanced Search Results',
    icon: 'fa-th',
    category: VisType.CATEGORY.KIBI,
    description: 'Display search results - just like "searches" - but allows one to click and select a result. ' +
                 'In Kibi other components can listen and react to these selections.',
    template,
    params: {
      defaults: {
        clickOptions: [],
        queryDefinitions: [],
        columns: [],
        columnAliases: []
      },
      editor: '<kibi-data-table-vis-params></kibi-data-table-vis-params>'
    },
    delegateSearch: true,
    init: function (vis, savedSearch) {
      if (savedSearch) {
        if (!vis.params.columns.length) {
          vis.params.columns = _.clone(savedSearch.columns);
        }
        vis.params.sort = _.clone(savedSearch.sort);
      }
    },
    version: 2
  });
}

export default KibiDataTableVisTypeProvider;
