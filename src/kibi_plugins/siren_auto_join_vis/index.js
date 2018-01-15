module.exports = function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/siren_auto_join_vis/siren_auto_join_vis'
      ]
    }
  });

};
