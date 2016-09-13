define(function (require) {
  return function TemplateRenderbotFactory(Private, $compile, $rootScope) {
    var _ = require('lodash');
    var Renderbot = Private(require('ui/Vis/Renderbot'));

    _.class(TemplateRenderbot).inherits(Renderbot);
    // kibi: added the multiSearch argument in order to pass msearch stats to the multisearch spy mode
    function TemplateRenderbot(vis, $el, uiState, multiSearch) {
      TemplateRenderbot.Super.call(this, vis, $el, uiState);

      this.$scope = $rootScope.$new();
      this.$scope.vis = vis;
      this.$scope.multiSearch = multiSearch;

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
