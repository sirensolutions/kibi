const kibiUtils = require('kibiutils');
const SqliteDatasourceDef = require('./sqlite_datasource_def');
const MysqlDatasourceDef = require('./mysql_datasource_def');
const PostgresqlDatasourceDef = require('./postgresql_datasource_def');
const SparqlHttpDatasourceDef = require('./sparql_http_datasource_def');
const RestDatasourceDef = require('./rest_datasource_def');
const SqlJdbcDatasourceDef = require('./jdbc_datasource_def');
const SparqlJdbcDatasourceDef = require('./jdbc_datasource_def');
const TinkerPop3DatasourceDef = require('./tinkerpop3_datasource_def');


module.exports = function (server, datasource) {

  switch (datasource.datasourceType.toLowerCase()) {
    case kibiUtils.DatasourceTypes.sqlite:
      datasource.datasourceClazz = new SqliteDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.rest:
      datasource.datasourceClazz = new RestDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.mysql:
      datasource.datasourceClazz = new MysqlDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.postgresql:
      datasource.datasourceClazz = new PostgresqlDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.sparql_http:
      datasource.datasourceClazz = new SparqlHttpDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.sql_jdbc:
      datasource.datasourceClazz = new SqlJdbcDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.sparql_jdbc:
      datasource.datasourceClazz = new SparqlJdbcDatasourceDef(server, datasource);
      break;
    case kibiUtils.DatasourceTypes.tinkerpop3:
      datasource.datasourceClazz = new TinkerPop3DatasourceDef(server, datasource);
      break;
    default:
      datasource.datasourceClazz = null;
      server.log(['error', 'set_datasource_clazz'], 'Unknown datasource [' + datasource.datasourceType + ']');
  }

};
