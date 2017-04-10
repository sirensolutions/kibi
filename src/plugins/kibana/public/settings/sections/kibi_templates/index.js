import _ from 'lodash';
import angular from 'angular';
import settingsSectionRegistry from 'ui/registry/settings_sections';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedTemplatesRegister from 'plugins/kibana/settings/sections/kibi_templates/services/saved_templates_register';
import 'plugins/kibana/settings/sections/kibi_templates/controllers/templates_editor';
import uiModules from 'ui/modules';

uiModules.get('apps/settings', ['ui.ace', 'monospaced.elastic']);

savedObjectRegistry.register(savedTemplatesRegister);

settingsSectionRegistry.register(_.constant({
  order: 13,
  name: 'templates',
  buttonLabel: 'Template',
  display: 'Templates',
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
}));

