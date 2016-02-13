define(function (require) {
  var angular = require('angular');
  require('plugins/kibana/settings/sections/kibi_datasources/controllers/datasources_editor');

  return {
    order: 0,
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
