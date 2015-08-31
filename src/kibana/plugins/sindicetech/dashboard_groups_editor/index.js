define(function (require) {

  var angular = require('angular');

  require('plugins/sindicetech/dashboard_groups_editor/controllers/dashboard_groups_editor');
  require('modules').get('apps/settings', ['ui.ace', 'monospaced.elastic']);

  return {
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
  };
});
