define(function (require) {
  const _ = require('lodash');
  return function mapTermsProvider(Promise, courier) {
    return function (filter) {
      if (filter.join_set || filter.join_sequence) {
        return Promise.resolve({ key: filter.meta.key, value: filter.meta.value });
      }
      return Promise.reject(filter);
    };
  };
});
