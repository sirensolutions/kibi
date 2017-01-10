const util = require('util');
const AbstractDatasourceDef = require('./abstract_datasource_def');
const datasourcesSchema = require('../datasources_schema');

function TinkerPop3DatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.tinkerpop3.concat(datasourcesSchema.base);
}

util.inherits(TinkerPop3DatasourceDef, AbstractDatasourceDef);

TinkerPop3DatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${url}');
};

module.exports = TinkerPop3DatasourceDef;
