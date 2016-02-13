define(function (require) {
  var _ = require('lodash');

  var hits = {
    hits: [
      {
        id: 'query1',
        title: '',
        st_resultQuery: 'SELECT * FROM mytable WHERE id = \'@doc[_source][id]@\''
      },
      {
        id: 'query2',
        title: '',
        st_resultQuery: 'SELECT * FROM mytable WHERE id = \'123\''
      }
    ]
  };

  return function (Promise) {

    var savedQueriesMock = {
      get: function (id) {
        var query = _.find(hits.hits, function (query) {
          return query.id === id;
        });
        if (query) {
          return Promise.resolve(query);
        } else {
          return Promise.reject(new Error('Could not find query [' + id + ']'));
        }
      },
      find: function () {
        return Promise.resolve(hits);
      }
    };


    return savedQueriesMock;
  };

});
