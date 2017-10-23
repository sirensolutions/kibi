export const jdbcDatasourceTranslate = {

  savedDatasourceToJdbcDatasource: function (savedDatasource) {
    return {
      _id: savedDatasource.title,
      _source: {
        jdbc: this.savedDatasourceParamsToJdbcDatasourceParams(savedDatasource.datasourceParams)
      }
    };
  },

  jdbcDatasourceToSavedDatasource: function (jdbcDatasource) {
    return {
      id: jdbcDatasource._id,
      title: jdbcDatasource._id,
      datasourceType: 'sql_jdbc_new',
      datasourceParams: this.jdbcDatasourceParamsToSavedDatasourceParams(jdbcDatasource._source.jdbc),
      url: '#/management/siren/datasources/' + jdbcDatasource._id
    };
  },

  savedDatasourceParamsToJdbcDatasourceParams: function (savedParams) {
    return {
      username: savedParams.username,
      password: savedParams.password,
      timezone: savedParams.timezone,
      driver: savedParams.drivername,
      url: savedParams.connection_string
    };
  },

  jdbcDatasourceParamsToSavedDatasourceParams: function (jdbcParams) {
    return {
      username: jdbcParams.username,
      password: jdbcParams.password,
      timezone: jdbcParams.timezone,
      drivername: jdbcParams.driver,
      connection_string: jdbcParams.url
    };
  }
};
