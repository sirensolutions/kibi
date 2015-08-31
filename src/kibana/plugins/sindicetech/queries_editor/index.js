define(function (require) {

  var angular = require('angular');

  require('plugins/sindicetech/queries_editor/controllers/queries_editor');
  require('modules').get('apps/settings', ['ui.ace', 'monospaced.elastic']);

  return {
    name: 'queries',
    buttonLabel: 'Query',
    display: 'Queries',
    url: '#/settings/queries',
    openObjectFinder: function () {
      angular.element(document.getElementById('queries_editor')).scope().openQueryFinder();
    },
    newObject: function () {
      angular.element(document.getElementById('queries_editor')).scope().newQuery();
    },
    saveObject: function () {
      angular.element(document.getElementById('queries_editor')).scope().submit();
    }
  };
});
