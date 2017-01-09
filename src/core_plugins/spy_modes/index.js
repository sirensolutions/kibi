export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        // KIBI5: see how to register the spy without modifying this file
        // kibi: added a mode for msearch requests
        'kibi_plugins/spyModes/multi_search_spy_mode',
        'plugins/spy_modes/table_spy_mode',
        'plugins/spy_modes/req_resp_stats_spy_mode'
      ]
    }
  });
};
