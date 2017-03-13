import _ from 'lodash';
import angular from 'angular';
import settingsSectionRegistry from 'ui/registry/settings_sections';
import uiModules from 'ui/modules';
import 'plugins/kibana/settings/sections/kibi_relations/controllers/relations';

uiModules.get('apps/settings', ['monospaced.elastic']);

settingsSectionRegistry.register(_.constant({
  order: 10,
  name: 'relations',
  buttonLabel: 'Relations',
  display: 'Relations',
  url: '#/settings/relations',
  isObjectValid: function () {
    return angular.element(document.getElementById('relations')).scope().isObjectValid();
  },
  saveObject: function () {
    angular.element(document.getElementById('relations')).scope().submit();
  }
}));
