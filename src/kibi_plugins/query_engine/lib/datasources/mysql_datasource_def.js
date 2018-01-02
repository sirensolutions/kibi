import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function MysqlDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('mysql');
}

util.inherits(MysqlDatasourceDef, AbstractDatasourceDef);

MysqlDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('mysql://${username}:${password}@${host}/${dbname}');
};

module.exports = MysqlDatasourceDef;
