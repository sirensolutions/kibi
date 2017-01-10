const util = require('util');
const AbstractDatasourceDef = require('./abstract_datasource_def');
const datasourcesSchema = require('../datasources_schema');

function SqliteDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.sqlite.concat(datasourcesSchema.base);
}

util.inherits(SqliteDatasourceDef, AbstractDatasourceDef);

SqliteDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${db_file_path}');
};

module.exports = SqliteDatasourceDef;
