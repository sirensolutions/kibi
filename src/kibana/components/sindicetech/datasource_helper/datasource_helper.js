define(function (require) {
  return function DatasourceHelperFactory(configFile) {

    function DatasourceHelper() {
    }

    DatasourceHelper.prototype.getDatasourceType = function (datasourceId) {

      for (var i = 0; i < configFile.datasources.length; i++) {
        if (configFile.datasources[i].id === datasourceId) {
          return configFile.datasources[i].type;
        }
      }

    };

    return new DatasourceHelper();
  };

});
