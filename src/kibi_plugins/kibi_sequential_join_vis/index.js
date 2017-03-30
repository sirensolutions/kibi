module.exports = function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/kibi_sequential_join_vis/kibi_sequential_join_vis'
      ]
    }
  });

};
