import _ from 'lodash';
import VisVisTypeProvider from 'ui/vis/vis_type';
import TemplateVisTypeTemplateRenderbotProvider from 'ui/template_vis_type/template_renderbot';
export default function TemplateVisTypeFactory(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateRenderbot = Private(TemplateVisTypeTemplateRenderbotProvider);

  _.class(TemplateVisType).inherits(VisType);
  function TemplateVisType(opts = {}) {
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
