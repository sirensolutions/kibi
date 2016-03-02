define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboards = [
      {
        id: 'Persons',
        title: 'Persons',
        savedSearchId: 'saved-search-person'
      },
      {
        id: 'Articles0',
        title: 'Articles0',
        savedSearchId: 'saved-search-articles0'
      },
      {
        id: 'Articles1',
        title: 'Articles1',
        savedSearchId: 'saved-search-articles1'
      },
      {
        id: 'Articles2',
        title: 'Articles2',
        savedSearchId: 'saved-search-articles2'
      },
      {
        id: 'Companies',
        title: 'Companies',
        savedSearchId: 'saved-search-companies'
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
