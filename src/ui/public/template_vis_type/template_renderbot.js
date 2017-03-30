import _ from 'lodash';
import VisRenderbotProvider from 'ui/vis/renderbot';
export default function TemplateRenderbotFactory(Private, $compile, $rootScope) {
  const Renderbot = Private(VisRenderbotProvider);

  _.class(TemplateRenderbot).inherits(Renderbot);
  // kibi: added the multiSearch argument in order to pass msearch stats to the multisearch spy mode
  // kibi: added searchSource so that the visualize directive may delegate the searchSource handling to the visualization
  function TemplateRenderbot(vis, $el, uiState, multiSearchData, searchSource) {
    TemplateRenderbot.Super.call(this, vis, $el, uiState);

    this.$scope = $rootScope.$new();
    this.$scope.vis = vis;
    this.$scope.uiState = uiState;

    // kibi: pass some more data
    this.$scope.multiSearchData = multiSearchData;
    this.$scope.searchSource = searchSource;

    $el.html($compile(this.vis.type.template)(this.$scope));
  }

  TemplateRenderbot.prototype.render = function (esResponse) {
    this.$scope.esResponse = esResponse;
  };

  TemplateRenderbot.prototype.destroy = function () {
    this.$scope.$destroy();
  };

  return TemplateRenderbot;
};
