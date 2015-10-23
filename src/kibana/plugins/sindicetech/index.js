define(function (require) {

  require('registry/vis_types').register(function SindicetechEntityInfoVisPrivateModuleLoader(Private) {
    return Private(require('plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis'));
  });
  require('registry/vis_types').register(function SindicetechtableVisPrivateModuleLoader(Private) {
    return Private(require('plugins/sindicetech/sindicetechtable_vis/sindicetechtable_vis'));
  });
  require('registry/vis_types').register(function SindicetechWordcloudVisPrivateModuleLoader(Private) {
    return Private(require('plugins/sindicetech/sindicetech_wordcloud_vis/sindicetech_wordcloud_vis'));
  });
  require('registry/vis_types').register(function KibiRelationalButtonsVisPrivateModuleLoader(Private) {
    return Private(require('plugins/kibi/relational_buttons_vis/relational_buttons_vis'));
  });

});
