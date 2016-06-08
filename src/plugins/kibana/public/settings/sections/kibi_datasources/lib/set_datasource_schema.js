define(function (require) {
  var _ = require('lodash');
  var kibiUtils = require('kibiutils');

  return function (Private, kibiDatasourcesSchema) {

    return function (datasource) {
      datasource.schema = [];

      var base = kibiDatasourcesSchema.base;

      switch (datasource.datasourceType.toLowerCase()) {
        case kibiUtils.DatasourceTypes.rest:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.rest);
          break;
        case kibiUtils.DatasourceTypes.sqlite:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.sqlite);
          break;
        case kibiUtils.DatasourceTypes.mysql:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.mysql);
          break;
        case kibiUtils.DatasourceTypes.postgresql:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.postgresql);
          break;
        case kibiUtils.DatasourceTypes.sparql_http:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.sparql_http);
          break;
        case kibiUtils.DatasourceTypes.sql_jdbc:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.jdbc);
          break;
        case kibiUtils.DatasourceTypes.sparql_jdbc:
          datasource.schema = mergeByName(base, kibiDatasourcesSchema.jdbc);
          break;
        case kibiUtils.DatasourceTypes.tinkerpop3:
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
        // remove parameters not found in schema
        _.each(datasource.datasourceParams, function (key, value) {
          var found = _.find(datasource.schema, function (s) {
            return s.name === key;
          });
          if (!found) {
            delete datasource.datasourceParams[key];
          }
        });

      }
    };

    function mergeByName(baseObject, additionalProps) {
      var result = [];
      _.each(baseObject, function (o) {
        result.push(o);
      });
      _.each(additionalProps, function (arr2obj) {
        var arr1obj = _.find(baseObject, function (arr1obj) {
          return arr1obj.name === arr2obj.name;
        });

        arr1obj ? _.extend(arr1obj, arr2obj) : result.push(arr2obj);
      });

      return result;
    }
  };

});
