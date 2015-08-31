define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboards = [
      {
        'id': 'Articles'
      },
      {
        'id': 'Companies'
      }
    ];

    var savedDashboardsMock = {
      get: function (id) {
        var dashboard = _.find(dashboards, function (dashboard) {
          return dashboard.id === id;
        });
        if (dashboard) {
          return Promise.resolve(dashboard);
        } else {
          return Promise.reject();
        }
      },
      find: function () {
        return Promise.resolve({
          'hits': dashboards
        });
      }
    };

    return savedDashboardsMock;
  };
});
