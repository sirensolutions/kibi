module.exports = function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/kibi_auto_join_vis/kibi_auto_join_vis'
      ]
    }
  });

};
