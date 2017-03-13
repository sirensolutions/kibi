var util = require('util');
var AbstractDatasourceDef = require('./abstract_datasource_def');
var datasourcesSchema = require('../datasources_schema');

function JdbcDatasourceDef(server, datasource) {
  AbstractDatasourceDef.call(this, server, datasource);
  this.schema = datasourcesSchema.jdbc.concat(datasourcesSchema.base);
}

util.inherits(JdbcDatasourceDef, AbstractDatasourceDef);

JdbcDatasourceDef.prototype.getConnectionString = function () {
  //TODO: / Kibi / what the string will be?
  return this.populateParameters('jdbc://${username}:${password}@${host}/${dbname}');
};


module.exports = JdbcDatasourceDef;
