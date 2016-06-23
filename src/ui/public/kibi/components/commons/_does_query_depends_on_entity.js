define(function (require) {

  return function ShouldEntityURIBeEnabledFactory(savedQueries, Promise) {

    var _ = require('lodash');

    var _checkSingleQuery = function (query) {
      var regex = /@doc\[.+?\]@/;
      // check for sparql and sql queries
      if (regex.test(query.activationQuery) || regex.test(query.resultQuery)) {
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

    return function (queryIds) {
      for (var i = 0; i < queryIds.length; i++) {
        if (_checkSingleQuery(queryIds[i])) {
          return true;
        }
      }
      return false;
    };

  };
});
