var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var config = require('../../../config');


function MysqlDatasourceDef(datasource) {
  AbstractDatasourceDef.call(this, datasource);
  this.schema = config.kibana.datasources_schema.mysql.concat(config.kibana.datasources_schema.base);
}

util.inherits(MysqlDatasourceDef, AbstractDatasourceDef);

MysqlDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('mysql://${username}:${password}@${host}/${dbname}');
};

module.exports = MysqlDatasourceDef;
