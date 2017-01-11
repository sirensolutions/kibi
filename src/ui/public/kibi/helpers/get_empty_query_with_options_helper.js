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
      for (const i in queryOption) {
        if (queryOption[i] !== null) {
          query.query_string[i] = queryOption[i];
        }
      }
      return query;
    };

    return new GetEmptyQueryOptionHelper();
  };

});
