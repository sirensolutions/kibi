var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var config = require('../../../config');

function RestDatasourceDef(datasource) {
  AbstractDatasourceDef.call(this, datasource);
  this.schema = config.kibana.datasources_schema.rest.concat(config.kibana.datasources_schema.base);
}

util.inherits(RestDatasourceDef, AbstractDatasourceDef);

RestDatasourceDef.prototype.getConnectionString = function () {
  return this.populateParameters('${url}');
};

module.exports = RestDatasourceDef;
