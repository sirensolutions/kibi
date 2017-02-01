import util from 'util';
import AbstractDatasourceDef from './abstract_datasource_def';
import datasourcesSchema from '../datasources_schema';

function TinkerPop3DatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.getSchema('tinkerpop3');
}

util.inherits(TinkerPop3DatasourceDef, AbstractDatasourceDef);

TinkerPop3DatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${url}');
};

module.exports = TinkerPop3DatasourceDef;
