module.exports = function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/kibi_data_table_vis/kibi_data_table_vis'
      ]
    }
  });

};
