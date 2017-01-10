const util = require('util');
const AbstractDatasourceDef = require('./abstract_datasource_def');
const datasourcesSchema = require('../datasources_schema');

function RestDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.rest.concat(datasourcesSchema.base);
}

util.inherits(RestDatasourceDef, AbstractDatasourceDef);

RestDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${url}');
};

module.exports = RestDatasourceDef;
