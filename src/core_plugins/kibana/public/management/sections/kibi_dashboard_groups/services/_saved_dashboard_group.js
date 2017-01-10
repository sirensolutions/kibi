define(function (require) {
  const _ = require('lodash');

  const module = require('ui/modules').get('dashboard_groups_editor/services/saved_dashboard_groups', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedDashboardGroup', function (courier) {

    _.class(SavedDashboardGroup).inherits(courier.SavedObject);

    function SavedDashboardGroup(id) {
      courier.SavedObject.call(this, {
        type: SavedDashboardGroup.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          dashboards: 'json',
          priority: 'long',
          iconCss: 'string',
          iconUrl: 'string',
          hide: 'boolean',
          version: 'integer'
        },

        defaults: {
          title: 'New Saved Dashboard Group',
          description: '',
          dashboards: [],
          priority: 100,
          iconCss: '',
          iconUrl: '',
          hide: false,
          version: 1
        },

        searchSource: true,
        init: function () {
          try {
            if (this.dashboards && typeof this.dashboards === 'string') {
              this.dashboards = JSON.parse(this.dashboards);
            }
          } catch (e) {
            throw new Error('Could not parse dashboards for dashboard group [' + this.id + ']');
          }
        }
      });
    }

    SavedDashboardGroup.type = 'dashboardgroup';



    return SavedDashboardGroup;
  });
});
