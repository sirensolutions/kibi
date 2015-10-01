define(function (require) {
  var _ = require('lodash');

  var hits = {
    hits: [
      {
        id: 'ds1',
        title: 'ds1 datasource',
        datasourceType: 'sparql_http'
      },
      {
        id: 'ds2',
        title: 'ds2 datasource',
        datasourceType: 'mysql'
      },
      {
        id: 'ds3',
        title: 'ds3 datasource',
        datasourceType: 'rest'
      }
    ]
  };

  return function (Promise) {

    var savedDatasourcesMock = {
      get: function (id) {
        var datasource = _.find(hits.hits, function (datasource) {
          return datasource.id === id;
        });
        if (datasource) {
          return Promise.resolve(datasource);
        } else {
          return Promise.reject(new Error('Could not find datasource [' + id + ']'));
        }
      },
      find: function () {
        return Promise.resolve(hits);
      }
    };


    return savedDatasourcesMock;
  };

});
