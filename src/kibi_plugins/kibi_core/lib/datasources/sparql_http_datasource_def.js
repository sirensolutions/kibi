const util = require('util');
const AbstractDatasourceDef = require('./abstract_datasource_def');
const datasourcesSchema = require('../datasources_schema');

function SparqlHttpDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.sparql_http.concat(datasourcesSchema.base);
}

util.inherits(SparqlHttpDatasourceDef, AbstractDatasourceDef);

SparqlHttpDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${endpoint_url}');
};

module.exports = SparqlHttpDatasourceDef;
