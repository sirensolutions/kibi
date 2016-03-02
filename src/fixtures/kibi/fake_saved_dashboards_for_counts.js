define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboards = [
      {
        id: 'Articles',
        title: 'Articles'
      },
      {
        id: 'search-ste',
        title: 'search-ste',
        savedSearchId: 'search-ste'
      },
      {
        id: 'time-testing-4',
        title: 'time-testing-4',
        timeRestore: true,
        timeFrom: '2005-09-01T12:00:00.000Z',
        timeTo: '2015-09-05T12:00:00.000Z',
        savedSearchId: 'time-testing-4'
      }
    ];
    let extras = [];

    var savedDashboardsMock = {
      /**
       * Add a new dashboard
       */
      addExtra: function (dashboard) {
        extras.push(dashboard);
      },
      removeExtras: function () {
        extras = [];
      },
      get: function (id) {
        const concatenated = dashboards.concat(extras);
        var dashboard = _.find(concatenated, 'id', id);
        if (dashboard) {
          return Promise.resolve(dashboard);
        } else {
          return Promise.reject(new Error('Could not find a dashboard with id: ' + id));
        }
      },
      find: function () {
        const concatenated = dashboards.concat(extras);
        return Promise.resolve({
          hits: concatenated,
          total: concatenated.length
        });
      }
    };

    return savedDashboardsMock;
  };
});
