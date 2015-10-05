var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var config = require('../../../config');


function PostgresqlDatasourceDef(datasource) {
  AbstractDatasourceDef.call(this, datasource);
  this.schema = config.kibana.datasources_schema.postgresql.concat(config.kibana.datasources_schema.base);
}

util.inherits(PostgresqlDatasourceDef, AbstractDatasourceDef);

PostgresqlDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('pgsql://${username}:${password}@${host}/${dbname}');
};

module.exports = PostgresqlDatasourceDef;
