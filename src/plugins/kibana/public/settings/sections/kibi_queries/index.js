import _ from 'lodash';
import angular from 'angular';
import settingsSectionRegistry from 'ui/registry/settings_sections';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedQueriesRegister from 'plugins/kibana/settings/sections/kibi_queries/services/saved_query_register';
import 'plugins/kibana/settings/sections/kibi_queries/controllers/queries_editor';
import uiModules from 'ui/modules';

uiModules.get('apps/settings', ['ui.ace', 'monospaced.elastic']);

savedObjectRegistry.register(savedQueriesRegister);

settingsSectionRegistry.register(_.constant({
  order: 12,
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
}));
