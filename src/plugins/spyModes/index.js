module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        // kibi: added a mode for msearch requests
        'plugins/spyModes/multi_search_spy_mode',
        'plugins/spyModes/tableSpyMode',
        'plugins/spyModes/reqRespStatsSpyMode'
      ]
    }
  });
};
