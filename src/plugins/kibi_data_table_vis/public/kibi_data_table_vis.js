define(function (require) {
  // we need to load the css ourselves
  require('plugins/kibi_data_table_vis/kibi_data_table_vis.less');

  // we also need to load the controller and used by the template
  require('plugins/kibi_data_table_vis/kibi_data_table_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/kibi_data_table_vis/kibi_data_table_vis_params');

  // register the provider with the visTypes registry
  require('ui/registry/vis_types').register(KibiDataTableVisTypeProvider);

  require('ui/kibi/kibi_doc_table/components/kibi_table_sorting');

  function KibiDataTableVisTypeProvider(Private, config) {
    const TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));
    const _ = require('lodash');

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'kibi-data-table',
      title: 'Enhanced search results',
      icon: 'fa-th',
      description: 'Display search results - just like "searches" - but allows one to click and select a result. ' +
                   'In Kibi other components can listen and react to these selections.',
      template: require('plugins/kibi_data_table_vis/kibi_data_table_vis.html'),
      params: {
        defaults: {
          clickOptions: [],
          queryDefinitions: [],
          columns: [],
          columnAliases: [],
          pageSize: (config.get('discover:sampleSize') || 50)
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

  return KibiDataTableVisTypeProvider;
});
