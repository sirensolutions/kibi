var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var config = require('../../../config');

function SqliteDatasourceDef(datasource) {
  AbstractDatasourceDef.call(this, datasource);
  this.schema = config.kibana.datasources_schema.sqlite.concat(config.kibana.datasources_schema.base);
}

util.inherits(SqliteDatasourceDef, AbstractDatasourceDef);

SqliteDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${db_file_path}');
};

module.exports = SqliteDatasourceDef;
