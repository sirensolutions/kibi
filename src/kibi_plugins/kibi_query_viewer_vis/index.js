module.exports = function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/kibi_query_viewer_vis/kibi_query_viewer_vis'
      ]
    }
  });

};
