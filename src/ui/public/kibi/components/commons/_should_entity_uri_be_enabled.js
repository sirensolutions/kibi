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

    return function (queryIds, queries, detailed = false) {

      // if queries provided check them
      if (queries) {

        if (detailed) {
          return Promise.resolve(_.map(queries, (query) => _checkSingleQuery(query)));
        } else {
          for (var i = 0; i < queries.length; i++) {
            if (_checkSingleQuery(queries[i]) === true) {
              return Promise.resolve(true);
            }
          }
          return Promise.resolve(false);
        }

      } else {

        return savedQueries.find().then((results) => {
          const missingQueries = _.filter(queryIds, (queryId) => !_.find(results.hits, 'id', queryId));
          if (missingQueries.length) {
            return Promise.reject(new Error(`Unable to find queries: ${JSON.stringify(missingQueries)}`));
          }

          if (detailed) {
            return _.map(queryIds, (queryId) => _checkSingleQuery(_.find(results.hits, 'id', queryId)));
          } else {
            for (var i = 0; i < results.hits.length; i++) {
              if (_.contains(queryIds, results.hits[i].id) && _checkSingleQuery(results.hits[i]) === true) {
                return true;
              }
            }
            return false;
          }
        });

      }
    };

  };
});
