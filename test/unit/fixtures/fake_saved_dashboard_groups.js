define(function (require) {
  var _ = require('lodash');

  return function (Promise) {

    var dashboardGroups = [
      {
        id: 'group-1',
        title: 'Group 1',
        priority: 1,
        dashboards: [
          {
            title: 'Companies',
            id: 'Companies'
          },
          {
            id: 'Articles',
            title: 'Articles'
          }
        ]
      },
      {
        id: 'group-2',
        title: 'Group 2',
        priority: 2,
        dashboards: []
      }
    ];

    var savedDashboardGroupsMock = {
      get: function (id) {
        var dashboardGroup = _.find(dashboardGroups, function (dashboardGroup) {
          return dashboardGroup.id === id;
        });
        if (dashboardGroup) {
          return Promise.resolve(dashboardGroup);
        } else {
          return Promise.reject();
        }
      },
      find: function () {
        return Promise.resolve({
          'hits': dashboardGroups
        });
      }
    };

    return savedDashboardGroupsMock;
  };
});
