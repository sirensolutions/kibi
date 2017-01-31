import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function PostgresqlDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('postgresql');
}

util.inherits(PostgresqlDatasourceDef, AbstractDatasourceDef);

PostgresqlDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('pgsql://${username}:${password}@${host}/${dbname}');
};

module.exports = PostgresqlDatasourceDef;
