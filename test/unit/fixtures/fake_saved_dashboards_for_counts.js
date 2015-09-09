define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboards = [
      {
        id: 'Articles'
      },
      {
        id: 'time-testing-4',
        timeRestore: true,
        timeFrom: '2005-09-01T12:00:00.000Z',
        timeTo: '2015-09-05T12:00:00.000Z',
        savedSearchId: 'time-testing-4'
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
          return Promise.reject(new Error('Could not find a dashboard with id: ' + id));
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
