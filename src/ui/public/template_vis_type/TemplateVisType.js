define(function (require) {
  return function TemplateVisTypeFactory(Private) {
    let _ = require('lodash');
    let VisType = Private(require('ui/Vis/VisType'));
    let TemplateRenderbot = Private(require('ui/template_vis_type/TemplateRenderbot'));

    _.class(TemplateVisType).inherits(VisType);
    function TemplateVisType(opts) {
      TemplateVisType.Super.call(this, opts);

      this.template = opts.template;
      if (!this.template) {
        throw new Error('Missing template for TemplateVisType');
      }
    }

    // kibi: added the multiSearch argument for the multi search spy mode
    // kibi: added searchSource so that the visualize directive may delegate the searchSource handling to the visualization
    TemplateVisType.prototype.createRenderbot = function (vis, $el, uiState, multiSearchData, searchSource) {
      return new TemplateRenderbot(vis, $el, uiState, multiSearchData, searchSource);
    };

    return TemplateVisType;
  };
});
