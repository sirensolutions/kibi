import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
uiModules
.get('kibi_datasources/services/jdbc_datasources')
.service('jdbcDatasources', function ($http) {

  class JdbcDatasources {
    constructor() {
      this.baseUrl = chrome.getBasePath() + '/elasticsearch/_vanguard/connector/datasource/';
    }
    get(id) {
      return $http.get(this.baseUrl + id).then(resp => resp.data);
    }

    list() {
      // TODO: remove when Fabio will give me new jar
      return Promise.resolve([
        {
          _id: 'mysql',
          _source: {
            jdbc: {
              username: 'root',
              password: 'password',
              driver: 'com.mysql.jdbc.Driver',
              url: 'jdbc:mysql://localhost:3306/employees'
            }
          }
        },
        {
          _id: 'ccc',
          _source: {
            jdbc: {
              username: 'root',
              password: 'password',
              driver: 'com.mysql.jdbc.Driver',
              url: 'jdbc:mysql://localhost:3306/employees'
            }
          }
        }
      ]);
      //return $http.get(chrome.getBasePath() + '/elasticsearch/_vanguard/connector/datasource/');
    }

    save(datasource) {
      return $http.put(this.baseUrl + datasource._id, datasource._source);
    }

    delete(id) {
      return $http.delete(this.baseUrl + id);
    }

    validate(datasource) {
      return $http.post(this.baseUrl + datasource._id + '/_validate', datasource._source).then(res => res.data);
    }
  }

  return new JdbcDatasources();
});
