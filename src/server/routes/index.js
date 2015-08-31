var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');

router.get('/config', function (req, res, next) {
  var keys = [
    'kibana_index',
    'default_app_id',
    'shard_timeout',
    'default_dashboard_id' // added by kibi
  ];
  var data = _.pick(config.kibana, keys);

  // added by kibi start - add filtered datasources information
  data.elasticsearch_plugins = config.elasticsearch_plugins;
  data.datasources = [];
  if (config.kibana.datasources) {
    var ids = Object.keys(config.kibana.datasources);
    _.each(ids, function (id) {

      var datasource = {
        id: id,
        type: config.kibana.datasources[id].type
      };
      if (config.kibana.datasources[id].type === 'rest' && config.kibana.datasources[id].params) {

        datasource.params = [];
        _.each(config.kibana.datasources[id].params, function (param) {
          if (param.display !== false) {
            datasource.params.push(param);
          }
        });

        datasource.headers = [];
        _.each(config.kibana.datasources[id].headers, function (header) {
          if (header.display !== false) {
            datasource.headers.push(header);
          }
        });

      }
      data.datasources.push(datasource);
    });
  }
  // added by kibi end

  data.plugins = config.plugins;
  res.json(data);
});

module.exports = router;
