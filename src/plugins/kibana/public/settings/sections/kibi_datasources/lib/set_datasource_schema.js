define(function (require) {
  var _ = require('lodash');

  return function (Private, kibiDatasourcesSchema) {

    return function (datasource) {

      var base = kibiDatasourcesSchema.base;

      switch (datasource.datasourceType.toLowerCase()) {
        case 'rest':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.rest);
          break;
        case 'sqlite':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.sqlite);
          break;
        case 'mysql':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.mysql);
          break;
        case 'postgresql':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.postgresql);
          break;
        case 'sparql_http':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.sparql_http);
          break;
        case 'sql_jdbc':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.jdbc);
          break;
        case 'sparql_jdbc':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.jdbc);
          break;
        case 'tinkerpop3':
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.tinkerpop3);
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

    function mergeByName(base, additionalProps) {
      _.each(additionalProps, function (arr2obj) {
        var arr1obj = _.find(base, function (arr1obj) {
          return arr1obj.name === arr2obj.name;
        });

        arr1obj ? _.extend(arr1obj, arr2obj) : base.push(arr2obj);
      });

      return base;
    }
  };

});
