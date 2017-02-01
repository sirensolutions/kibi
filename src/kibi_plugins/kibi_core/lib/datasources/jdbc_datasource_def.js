import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function JdbcDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('jdbc');
}

util.inherits(JdbcDatasourceDef, AbstractDatasourceDef);

JdbcDatasourceDef.prototype.getConnectionString = function () {
  //TODO: / Kibi / what the string will be?
  return this.populateParameters('jdbc://${username}:${password}@${host}/${dbname}');
};

module.exports = JdbcDatasourceDef;
