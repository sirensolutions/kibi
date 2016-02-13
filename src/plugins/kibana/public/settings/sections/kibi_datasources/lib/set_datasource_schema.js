define(function (require) {
  var _ = require('lodash');

  return function (Private, kibiDatasourcesSchema) {

    return function (datasource) {

      var base = kibiDatasourcesSchema.base;

      switch (datasource.datasourceType.toLowerCase()) {
        case 'rest':
          datasource.schema = kibiDatasourcesSchema.rest.concat(base);
          break;
        case 'sqlite':
          datasource.schema = kibiDatasourcesSchema.sqlite.concat(base);
          break;
        case 'mysql':
          datasource.schema = kibiDatasourcesSchema.mysql.concat(base);
          break;
        case 'postgresql':
          datasource.schema = kibiDatasourcesSchema.postgresql.concat(base);
          break;
        case 'sparql_http':
          datasource.schema = kibiDatasourcesSchema.sparql_http.concat(base);
          break;
        case 'sql_jdbc':
          datasource.schema = kibiDatasourcesSchema.jdbc.concat(base);
          break;
        case 'sparql_jdbc':
          datasource.schema = kibiDatasourcesSchema.jdbc.concat(base);
          break;
        case 'tinkerpop3':
          datasource.schema = kibiDatasourcesSchema.tinkerpop3.concat(base);
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
