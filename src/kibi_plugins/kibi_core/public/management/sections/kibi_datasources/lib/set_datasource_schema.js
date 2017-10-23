import { isUndefined, each, find } from 'lodash';
import { DatasourceTypes } from 'kibiutils';

export default function setDatasourceSchemaFactory(kibiDatasourcesSchema) {
  return function setDatasourceSchema(datasource) {
    switch (datasource.datasourceType.toLowerCase()) {
      case DatasourceTypes.rest:
        datasource.schema = kibiDatasourcesSchema.rest;
        break;
      case DatasourceTypes.sqlite:
        datasource.schema = kibiDatasourcesSchema.sqlite;
        break;
      case DatasourceTypes.mysql:
        datasource.schema = kibiDatasourcesSchema.mysql;
        break;
      case DatasourceTypes.postgresql:
        datasource.schema = kibiDatasourcesSchema.postgresql;
        break;
      case DatasourceTypes.sparql_http:
        datasource.schema = kibiDatasourcesSchema.sparql_http;
        break;
      case 'sql_jdbc_new':
        datasource.schema = kibiDatasourcesSchema.jdbc_new;
        break;
      case DatasourceTypes.sql_jdbc:
      case DatasourceTypes.sparql_jdbc:
        datasource.schema = kibiDatasourcesSchema.jdbc;
        break;
      case DatasourceTypes.tinkerpop3:
        datasource.schema = kibiDatasourcesSchema.tinkerpop3;
        break;
      default:
        datasource.schema = [];
        datasource.datasourceDef = null;
    }

    if (isUndefined(datasource.id)) {
      each(datasource.schema, function (param) {
        let defaultValue = param.defaultValue;
        if (isUndefined(defaultValue)) {
          defaultValue = param.defaultValues;
        }
        if (isUndefined(datasource.datasourceParams[param.name]) && defaultValue) {
          datasource.datasourceParams[param.name] = defaultValue;
        }
      });
      // remove parameters not found in schema
      each(datasource.datasourceParams, function (key, value) {
        const found = find(datasource.schema, 'name', key);
        if (!found) {
          delete datasource.datasourceParams[key];
        }
      });
    }
  };
};
