define(function (require) {
  return function TemplateRenderbotFactory(Private, $compile, $rootScope) {
    let _ = require('lodash');
    let Renderbot = Private(require('ui/Vis/Renderbot'));

    _.class(TemplateRenderbot).inherits(Renderbot);
    // kibi: added the multiSearch argument in order to pass msearch stats to the multisearch spy mode
    // kibi: added searchSource so that the visualize directive may delegate the searchSource handling to the visualization
    // kibi: added uiState in order to pass state to visualizations
    function TemplateRenderbot(vis, $el, uiState, multiSearchData, searchSource) {
      TemplateRenderbot.Super.call(this, vis, $el, uiState);

      this.$scope = $rootScope.$new();
      this.$scope.vis = vis;
      this.$scope.multiSearchData = multiSearchData;
      this.$scope.searchSource = searchSource;
      this.$scope.uiState = uiState;

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
});
