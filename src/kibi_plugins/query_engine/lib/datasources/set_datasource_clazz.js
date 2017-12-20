import kibiUtils from 'kibiutils';
import SqliteDatasourceDef from './sqlite_datasource_def';
import MysqlDatasourceDef from './mysql_datasource_def';
import PostgresqlDatasourceDef from './postgresql_datasource_def';
import SparqlHttpDatasourceDef from './sparql_http_datasource_def';
import RestDatasourceDef from './rest_datasource_def';
import SqlJdbcDatasourceDef from './jdbc_datasource_def';
import SparqlJdbcDatasourceDef from './jdbc_datasource_def';
import TinkerPop3DatasourceDef from './tinkerpop3_datasource_def';
import SqlJdbcNewDatasourceDef from './jdbc_new_datasource_def';

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
    case 'sql_jdbc_new':
      datasource.datasourceClazz = new SqlJdbcNewDatasourceDef(server, datasource);
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
