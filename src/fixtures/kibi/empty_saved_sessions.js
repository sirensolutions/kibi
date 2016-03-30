define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var emptySavedSessionsMock = {
      get: function () {
        return Promise.reject();
      },
      find: function () {
        return Promise.resolve({
          'hits': []
        });
      }
    };

    return emptySavedSessionsMock;
  };
});
