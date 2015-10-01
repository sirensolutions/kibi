var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var config = require('../../../config');


function JdbcDatasourceDef(datasource) {
  AbstractDatasourceDef.call(this, datasource);
  this.schema = config.kibana.datasources_schema.jdbc.concat(config.kibana.datasources_schema.base);
}

util.inherits(JdbcDatasourceDef, AbstractDatasourceDef);

JdbcDatasourceDef.prototype.getConnectionString = function () {
  //TODO: what the string will be?
  return this.populateParameters('jdbc://${username}:${password}@${host}/${dbname}');
};


module.exports = JdbcDatasourceDef;
