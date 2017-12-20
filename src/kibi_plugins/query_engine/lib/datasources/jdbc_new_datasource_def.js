import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function JdbcNewDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('jdbc_new');
}

util.inherits(JdbcNewDatasourceDef, AbstractDatasourceDef);

JdbcNewDatasourceDef.prototype.getConnectionString = function () {
  //TODO: / Kibi / what the string will be?
  return this.populateParameters('jdbc://${username}:${password}@${host}/${dbname}');
};

module.exports = JdbcNewDatasourceDef;
