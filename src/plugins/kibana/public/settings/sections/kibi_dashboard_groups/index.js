import _ from 'lodash';
import angular from 'angular';
import settingsSectionRegistry from 'ui/registry/settings_sections';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedDashboardGroupsRegister from 'plugins/kibana/settings/sections/kibi_dashboard_groups/services/saved_dashboard_groups_register';
import 'plugins/kibana/settings/sections/kibi_dashboard_groups/controllers/dashboard_groups_editor';
import uiModules from 'ui/modules';

uiModules.get('apps/settings', ['ui.ace', 'monospaced.elastic']);

savedObjectRegistry.register(savedDashboardGroupsRegister);

settingsSectionRegistry.register(_.constant({
  order: 14,
  name: 'dashboardgroups',
  buttonLabel: 'Dashboard Group',
  display: 'Dashboard Groups',
  url: '#/settings/dashboardgroups',
  openObjectFinder: function () {
    angular.element(document.getElementById('dashboard_groups_editor')).scope().openDashboardGroupsFinder();
  },
  newObject: function () {
    angular.element(document.getElementById('dashboard_groups_editor')).scope().newDashboardGroup();
  },
  saveObject: function () {
    angular.element(document.getElementById('dashboard_groups_editor')).scope().submit();
  }
}));
