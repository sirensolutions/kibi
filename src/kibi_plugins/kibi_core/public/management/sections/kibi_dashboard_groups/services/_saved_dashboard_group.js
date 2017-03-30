import angular from 'angular';
import _ from 'lodash';
import uiModules from 'ui/modules';

uiModules
.get('dashboard_groups_editor/services/saved_dashboard_groups')
.factory('SavedDashboardGroup', function (courier) {

  _.class(SavedDashboardGroup).inherits(courier.SavedObject);

  function SavedDashboardGroup(id) {
    courier.SavedObject.call(this, {
      type: SavedDashboardGroup.type,
      mapping: SavedDashboardGroup.mapping,
      searchSource: SavedDashboardGroup.searchSource,
      init: SavedDashboardGroup.init,

      id: id,

      defaults: {
        title: 'New Saved Dashboard Group',
        description: '',
        dashboards: [],
        priority: 100,
        iconCss: '',
        iconUrl: '',
        hide: false,
        version: 1
      }
    });
  }

  SavedDashboardGroup.type = 'dashboardgroup';
  SavedDashboardGroup.searchSource = false;
  SavedDashboardGroup.mapping = {
    title: 'string',
    description: 'string',
    dashboards: 'json',
    priority: 'long',
    iconCss: 'string',
    iconUrl: 'string',
    hide: 'boolean',
    version: 'integer'
  };
  SavedDashboardGroup.init = function () {
    try {
      if (this.dashboards && typeof this.dashboards === 'string') {
        this.dashboards = JSON.parse(this.dashboards);
      }
    } catch (e) {
      throw new Error('Could not parse dashboards for dashboard group [' + this.id + ']');
    }
  };

  return SavedDashboardGroup;
});
