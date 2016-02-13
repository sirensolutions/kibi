define(function (require) {

  var angular = require('angular');

  require('ace');
  require('plugins/kibana/settings/sections/kibi_templates/controllers/templates_editor');
  require('ui/modules').get('apps/settings', ['ui.ace', 'monospaced.elastic']);

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
