var SqliteDatasourceDef      = require('./sqlite_datasource_def');
var MysqlDatasourceDef       = require('./mysql_datasource_def');
var PostgresqlDatasourceDef  = require('./postgresql_datasource_def');
var SparqlHttpDatasourceDef  = require('./sparql_http_datasource_def');
var RestDatasourceDef        = require('./rest_datasource_def');
var SqlJdbcDatasourceDef     = require('./jdbc_datasource_def');
var SparqlJdbcDatasourceDef  = require('./jdbc_datasource_def');
var TinkerPop3DatasourceDef  = require('./tinkerpop3_datasource_def');


module.exports = function (server, datasource) {

  switch (datasource.datasourceType.toLowerCase()) {
    case 'sqlite':
      datasource.datasourceClazz = new SqliteDatasourceDef(server, datasource);
      break;
    case 'rest':
      datasource.datasourceClazz = new RestDatasourceDef(server, datasource);
      break;
    case 'mysql':
      datasource.datasourceClazz = new MysqlDatasourceDef(server, datasource);
      break;
    case 'postgresql':
      datasource.datasourceClazz = new PostgresqlDatasourceDef(server, datasource);
      break;
    case 'sparql_http':
      datasource.datasourceClazz = new SparqlHttpDatasourceDef(server, datasource);
      break;
    case 'sql_jdbc':
      datasource.datasourceClazz = new SqlJdbcDatasourceDef(server, datasource);
      break;
    case 'sparql_jdbc':
      datasource.datasourceClazz = new SparqlJdbcDatasourceDef(server, datasource);
      break;
    case 'tinkerpop3':
      datasource.datasourceClazz = new TinkerPop3DatasourceDef(server, datasource);
      break;
    default:
      datasource.datasourceClazz = null;
      server.log(['error', 'set_datasource_clazz'], 'Unknown datasource [' + datasource.datasourceType + ']');
  }

};
