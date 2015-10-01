define(function (require) {

  var angular = require('angular');

  require('plugins/kibi/datasources_editor/controllers/datasources_editor');
  require('modules').get('apps/settings', ['ui.ace', 'monospaced.elastic']);

  return {
    name: 'datasources',
    buttonLabel: 'Datasource',
    display: 'Datasources',
    url: '#/settings/datasources',
    openObjectFinder: function () {
      angular.element(document.getElementById('datasources_editor')).scope().openDatasourcesFinder();
    },
    newObject: function () {
      angular.element(document.getElementById('datasources_editor')).scope().newDatasource();
    },
    saveObject: function () {
      angular.element(document.getElementById('datasources_editor')).scope().submit();
    }
  };
});
