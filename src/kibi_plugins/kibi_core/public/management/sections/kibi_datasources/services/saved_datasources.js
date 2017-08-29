import 'plugins/kibi_core/management/sections/kibi_datasources/services/_saved_datasource';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import savedDatasourceRegister from 'plugins/kibi_core/management/sections/kibi_datasources/services/saved_datasource_register';

SavedObjectRegistryProvider.register(savedDatasourceRegister);

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedDatasources',
  title: 'datasources'
});

// This is the only thing that gets injected into controllers
uiModules
.get('kibi_datasources/services/saved_datasources')
.service('savedDatasources', function (savedObjectsAPI, Private, SavedDatasource, kbnIndex, esAdmin, kbnUrl) {
  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI
  };
  const SavedDatasourceLoader = new SavedObjectLoader(SavedDatasource, kbnIndex, esAdmin, kbnUrl, options);

  SavedDatasourceLoader.urlFor = function (id) {
    return kbnUrl.eval('#/management/siren/datasources/{{id}}', { id: id });
  };

  return SavedDatasourceLoader;
});
