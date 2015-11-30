var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');

router.get('/config', function (req, res, next) {
  var keys = [
    'kibana_index',
    'default_app_id',
    'shard_timeout',
    'xsrf_token',
    'default_dashboard_id', // added by kibi
    'datasources_schema' // added by kibi
  ];
  var data = _.pick(config.kibana, keys);
  data.plugins = config.plugins;

  // added by kibi start - add filtered datasources information
  data.elasticsearch_plugins = config.elasticsearch_plugins;

  var warnings = [];
  if (config.kibana.datasource_encryption_key === '3zTvzr3p67VC61jmV54rIYu1545x4TlY') {
    warnings.push(
      'Default key used for encryption! ' +
      'Please change datasource_encryption_key in kibi.yml ' +
      'and restart kibi');
  }
  // added by kibi end

  res.json({
    configFile: data,
    warnings: warnings  // as this is the first thing we gat from the server kibi will use it to pass some warnings
  });

});
module.exports = router;
