define(function (require) {

  return function ShouldEntityURIBeEnabledFactory(savedQueries, Promise) {

    var _ = require('lodash');

    return function (queryIds) {
      var promises = _(queryIds).compact().map(savedQueries.get).value();

      var regex = /@URI@|@TABLE@|@PKVALUE@/g;
      var regexRest = /@VAR[0-9]{1,}@/g;

      return Promise.all(promises).then(function (results) {
        var entityURIEnabled = false;

        _.each(results, function (savedQuery) {
          // check for sparql and sql queries
          if (regex.test(savedQuery.st_activationQuery) || regex.test(savedQuery.st_resultQuery)) {
            // requires entityURI
            entityURIEnabled = true;
            return false;
          }
          // test for rest queries
          if (savedQuery.rest_params || savedQuery.rest_headers) {
            _.each(savedQuery.rest_params, function (param) {
              if (regexRest.test(param.value)) {
                // requires entityURI
                entityURIEnabled = true;
                return false;
              }
            });
            _.each(savedQuery.rest_headers, function (header) {
              if (regexRest.test(header.value)) {
                // requires entityURI
                entityURIEnabled = true;
                return false;
              }
            });
          }
        });
        return entityURIEnabled;
      });
    };

  };
});
