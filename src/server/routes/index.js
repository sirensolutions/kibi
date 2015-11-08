var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');

router.get('/config', function (req, res, next) {
  var keys = [
    'kibana_index',
    'default_app_id',
    'shard_timeout',
    'default_dashboard_id', // added by kibi
    'datasources_schema' // added by kibi
  ];
  var data = _.pick(config.kibana, keys);
  data.plugins = config.plugins;

  // added by kibi start - add filtered datasources information
  data.elasticsearch_plugins = config.elasticsearch_plugins;

  var warnings = [];
  if (config.kibana.datasource_encryption_key === 'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=') {
    data.datasource_encryption_warning = true;
  }
  // added by kibi end

  res.json({
    configFile: data,
    warnings: warnings
  });

});
module.exports = router;
