import _ from 'lodash';
import angular from 'angular';
import settingsSectionRegistry from 'ui/registry/settings_sections';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedDatasourceRegister from 'plugins/kibana/settings/sections/kibi_datasources/services/saved_datasource_register';
import 'plugins/kibana/settings/sections/kibi_datasources/controllers/datasources_editor';

savedObjectRegistry.register(savedDatasourceRegister);

settingsSectionRegistry.register(_.constant({
  order: 11,
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
}));
