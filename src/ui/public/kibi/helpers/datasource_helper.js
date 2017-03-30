export default function DatasourceHelperFactory(savedDatasources) {

  function DatasourceHelper() {
  }

  DatasourceHelper.prototype.getDatasourceType = function (datasourceId) {
    return savedDatasources.get(datasourceId).then(function (datasource) {
      return datasource.datasourceType;
    });
  };

  return new DatasourceHelper();
};
