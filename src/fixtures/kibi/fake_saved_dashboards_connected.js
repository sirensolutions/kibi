define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboards = [
      {
        id: 'Articles1',
        savedSearchId: 'saved-search-articles1'
      },
      {
        id: 'Articles2',
        savedSearchId: 'saved-search-articles2'
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
