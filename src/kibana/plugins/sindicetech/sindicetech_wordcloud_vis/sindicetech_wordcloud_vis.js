define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/sindicetech/sindicetech_wordcloud_vis/sindicetech_wordcloud_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/sindicetech/sindicetech_wordcloud_vis/sindicetech_wordcloud_vis_controller');

  // our params are a bit complex so we will manage them with a directive
  require('plugins/sindicetech/sindicetech_wordcloud_vis/sindicetech_wordcloud_vis_params');

  // require the directives that we use as well
  require('components/agg_table/agg_table');
  require('components/agg_table/agg_table_group');

  // define the TableVisType
  return function SindicetechWordcloudVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    // define the TableVisController which is used in the template
    // by angular's ng-controller directive

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'sindicetech_wordcloud',
      title: 'Kibi Word cloud',
      icon: 'fa-cloud',
      description: 'Create a cloud of words from high frequency terms',
      template: require('text!plugins/sindicetech/sindicetech_wordcloud_vis/sindicetech_wordcloud_vis.html'),
      params: {
        defaults: {
          perPage: 10,
          showPartialRows: false,
          showMeticsAtAllLevels: false
        },
        editor: '<sindicetech-wordcloud-vis-params></sindicetech-wordcloud-vis-params>'
      },
      hierarchicalData: function (vis) {
        return Boolean(vis.params.showPartialRows || vis.params.showMeticsAtAllLevels);
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          max: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: 'Split Rows',
          aggFilter: ['terms', 'significant_terms'],
          min: 1,
          max: 1
        }
      ])
    });
  };
});
