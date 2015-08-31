define(function (require) {
  var _ = require('lodash');

  require('components/notify/notify');

  var module = require('modules').get('dashboard_groups_editor/services/saved_dashboard_groups', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedDashboardGroup', function (courier) {
    _(SavedDashboardGroup).inherits(courier.SavedObject);

    function SavedDashboardGroup(id) {
      courier.SavedObject.call(this, {
        type: SavedDashboardGroup.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          dashboards: 'string',
          priority: 'long',
          iconCss: 'string',
          iconUrl: 'string',
          version: 'long'
        },

        defaults: {
          title: 'New Saved Dashboard Group',
          description: '',
          dashboards: [],
          priority: 100,
          iconCss: '',
          iconUrl: '',
          version: 1
        },

        searchSource: true
      });
    }

    SavedDashboardGroup.type = 'dashboardgroup';



    return SavedDashboardGroup;
  });
});
