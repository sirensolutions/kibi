var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var datasourcesSchema = require('../datasources_schema');

function PostgresqlDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.postgresql.concat(datasourcesSchema.base);
}

util.inherits(PostgresqlDatasourceDef, AbstractDatasourceDef);

PostgresqlDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('pgsql://${username}:${password}@${host}/${dbname}');
};

module.exports = PostgresqlDatasourceDef;
