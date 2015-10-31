define(function (require) {

  require('registry/vis_types').register(function KibiTimelineVisPrivateModuleLoader(Private) {
    return Private(require('plugins/kibi/timeline_vis/timeline_vis'));
  });

});
