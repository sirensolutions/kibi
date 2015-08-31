define(function (require) {

  var angular = require('angular');

  require('plugins/sindicetech/templates_editor/controllers/templates_editor');
  require('modules').get('apps/settings', ['ui.ace', 'monospaced.elastic']);

  return {
    name: 'templates',
    buttonLabel: 'Template',
    display: 'Query templates',
    url: '#/settings/templates',
    openObjectFinder: function () {
      angular.element(document.getElementById('templates_editor')).scope().openTemplateFinder();
    },
    newObject: function () {
      angular.element(document.getElementById('templates_editor')).scope().newTemplate();
    },
    saveObject: function () {
      angular.element(document.getElementById('templates_editor')).scope().submit();
    }

  };
});
