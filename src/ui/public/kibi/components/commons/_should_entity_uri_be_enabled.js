define(function (require) {

  return function ShouldEntityURIBeEnabledFactory(savedQueries, Promise) {

    var _ = require('lodash');

    var _checkSingleQuery = function (query) {
      var regex = /@doc\[.+?\]@/;
      // check for sparql and sql queries
      if (regex.test(query.st_activationQuery) || regex.test(query.st_resultQuery)) {
        // requires entityURI
        return true;
      }

      // test for rest queries
      if (query.rest_params || query.rest_headers || query.rest_body || query.rest_path) {
        if (regex.test(query.rest_body)) {
          // requires entityURI
          return true;
        }
        if (regex.test(query.rest_path)) {
          // requires entityURI
          return true;
        }

        var i;
        if (query.rest_params) {
          for (i = 0; i < query.rest_params.length; i++) {
            if (regex.test(query.rest_params[i].value)) {
              return true;
            }
          }
        }
        if (query.rest_headers) {
          for (i = 0; i < query.rest_headers.length; i++) {
            if (regex.test(query.rest_headers[i].value)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    return function (queryIds, queries) {

      // if queries provided check them
      if (queries) {

        for (var i = 0; i < queries.length; i++) {
          if (_checkSingleQuery(queries[i]) === true) {
            return Promise.resolve(true);
          }
        }
        return Promise.resolve(false);

      } else {

        var promises = _(queryIds).compact().map(savedQueries.get).value();
        return Promise.all(promises).then(function (results) {
          for (var i = 0; i < results.length; i++) {
            if (_checkSingleQuery(results[i]) === true) {
              return true;
            }
          }
          return false;
        });

      }
    };

  };
});
