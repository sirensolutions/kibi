define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboards = [
      {
        id: 'Articles',
        title: 'Articles'
      },
      {
        id: 'Companies',
        title: 'Companies'
      },
      {
        id: 'time-testing-1',
        title: 'time testing 1',
        timeRestore: false
      },
      {
        id: 'time-testing-2',
        title: 'time testing 2',
        timeRestore: true,
        timeMode: 'quick',
        timeFrom: 'now-15y',
        timeTo: 'now'
      },
      {
        id: 'time-testing-3',
        title: 'time testing 3',
        timeRestore: true,
        timeMode: 'absolute',
        timeFrom: '2005-09-01T12:00:00.000Z',
        timeTo: '2015-09-05T12:00:00.000Z'
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
