import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function RestDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('rest');
}

util.inherits(RestDatasourceDef, AbstractDatasourceDef);

RestDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${url}');
};

module.exports = RestDatasourceDef;
