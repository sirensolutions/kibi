var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var config = require('../../../config');

function SparqlHttpDatasourceDef(datasource) {
  AbstractDatasourceDef.call(this, datasource);
  this.schema = config.kibana.datasources_schema.sparql_http.concat(config.kibana.datasources_schema.base);
}

util.inherits(SparqlHttpDatasourceDef, AbstractDatasourceDef);

SparqlHttpDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${endpoint_url}');
};

module.exports = SparqlHttpDatasourceDef;
