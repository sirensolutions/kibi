import management from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/controllers/dashboard_groups_editor';
import _ from 'lodash';
import angular from 'angular';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedDashboardGroups from 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups_register';

//settingsSectionRegistry.register(_.constant({
  //order: 14,
  //name: 'dashboardgroups',
  //buttonLabel: 'Dashboard Group',
  //display: 'Dashboard Groups',
  //url: '#/settings/dashboardgroups',
  //openObjectFinder: function () {
    //angular.element(document.getElementById('dashboard_groups_editor')).scope().openDashboardGroupsFinder();
  //},
  //newObject: function () {
    //angular.element(document.getElementById('dashboard_groups_editor')).scope().newDashboardGroup();
  //},
  //saveObject: function () {
    //angular.element(document.getElementById('dashboard_groups_editor')).scope().submit();
  //}
//}));

savedObjectRegistry.register(savedDashboardGroups);

management.getSection('kibana').register('dashboardgroups', {
  display: 'Dashboard Groups',
  order: 14,
  url: '#/management/kibana/dashboardgroups'
});
