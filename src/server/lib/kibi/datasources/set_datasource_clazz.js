var config = require('../../../config');
var SqliteDatasourceDef      = require('./sqlite_datasource_def');
var MysqlDatasourceDef       = require('./mysql_datasource_def');
var PostgresqlDatasourceDef  = require('./postgresql_datasource_def');
var SparqlHttpDatasourceDef  = require('./sparql_http_datasource_def');
var RestDatasourceDef        = require('./rest_datasource_def');
var SqlJdbcDatasourceDef     = require('./jdbc_datasource_def');
var SparqlJdbcDatasourceDef  = require('./jdbc_datasource_def');


module.exports = function (datasource) {

  switch (datasource.datasourceType.toLowerCase()) {
    case 'sqlite':
      datasource.datasourceClazz = new SqliteDatasourceDef(datasource);
      break;
    case 'rest':
      datasource.datasourceClazz = new RestDatasourceDef(datasource);
      break;
    case 'mysql':
      datasource.datasourceClazz = new MysqlDatasourceDef(datasource);
      break;
    case 'postgresql':
      datasource.datasourceClazz = new PostgresqlDatasourceDef(datasource);
      break;
    case 'sparql_http':
      datasource.datasourceClazz = new SparqlHttpDatasourceDef(datasource);
      break;
    case 'sql_jdbc':
      datasource.datasourceClazz = new SqlJdbcDatasourceDef(datasource);
      break;
    case 'sparql_jdbc':
      datasource.datasourceClazz = new SparqlJdbcDatasourceDef(datasource);
      break;
    default:
      datasource.datasourceClazz = null;
  }

};
