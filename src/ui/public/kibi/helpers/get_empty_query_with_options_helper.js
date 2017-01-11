define(function (require) {
  return function GetEmptyQueryOptionHelperFactory(config) {

    function GetEmptyQueryOptionHelper() {}

    GetEmptyQueryOptionHelper.prototype.getQuery = function () {
      const queryOption = config.get('query:queryString:options');
      const query = {
        query_string: {
          query: '*'
        }
      };
      for (const prop in queryOption) {
        if (queryOption[prop] !== null && queryOption.hasOwnProperty(prop)) {
          query.query_string[prop] = queryOption[prop];
        }
      }
      return query;
    };

    return new GetEmptyQueryOptionHelper();
  };

});
