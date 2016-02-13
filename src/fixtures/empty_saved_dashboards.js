define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var emptySavedDashboardsMock = {
      get: function () {
        return Promise.reject();
      },
      find: function () {
        return Promise.resolve({
          'hits': []
        });
      }
    };

    return emptySavedDashboardsMock;
  };
});
