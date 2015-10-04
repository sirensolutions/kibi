define(function (require) {
  var _ = require('lodash');

  return function (Private, configFile) {

    return function (datasource) {

      var base = configFile.datasources_schema.base;

      switch (datasource.datasourceType.toLowerCase()) {
        case 'rest':
          datasource.schema = configFile.datasources_schema.rest.concat(base);
          break;
        case 'sqlite':
          datasource.schema = configFile.datasources_schema.sqlite.concat(base);
          break;
        case 'mysql':
          datasource.schema = configFile.datasources_schema.mysql.concat(base);
          break;
        case 'postgresql':
          datasource.schema = configFile.datasources_schema.postgresql.concat(base);
          break;
        case 'sparql_http':
          datasource.schema = configFile.datasources_schema.sparql_http.concat(base);
          break;
        case 'sql_jdbc':
          datasource.schema = configFile.datasources_schema.jdbc.concat(base);
          break;
        case 'sparql_jdbc':
          datasource.schema = configFile.datasources_schema.jdbc.concat(base);
          break;
        default:
          datasource.datasourceDef = null;
      }

      if (typeof datasource.id === 'undefined') {
        _.each(datasource.schema, function (param) {
          var defaultValue = param.defaultValue;
          if (typeof defaultValue === 'undefined') {
            defaultValue = param.defaultValues;
          }
          if (typeof datasource.datasourceParams[param.name] === 'undefined' && defaultValue) {
            datasource.datasourceParams[param.name] = defaultValue;
          }
        });
      }

    };
  };

});
