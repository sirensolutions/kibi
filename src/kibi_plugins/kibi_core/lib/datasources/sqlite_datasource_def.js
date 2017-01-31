import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function SqliteDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('sqlite');
}

util.inherits(SqliteDatasourceDef, AbstractDatasourceDef);

SqliteDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${db_file_path}');
};

module.exports = SqliteDatasourceDef;
