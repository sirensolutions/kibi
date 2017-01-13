import 'plugins/kibi_core/management/sections/kibi_datasources/services/_saved_datasource';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedDatasourceRegister from 'plugins/kibi_core/management/sections/kibi_datasources/services/saved_datasource_register';

savedObjectRegistry.register(savedDatasourceRegister);

// Register this service with the saved object registry so it can be
// edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedDatasources',
  title: 'datasources'
});

// This is the only thing that gets injected into controllers
uiModules
.get('kibi_datasources/services/saved_datasources')
.service('savedDatasources', function (savedObjectsAPI, Private, SavedDatasource, kbnIndex, esAdmin, kbnUrl) {
  const cache = Private(CacheProvider);
  return new SavedObjectLoader(SavedDatasource, kbnIndex, esAdmin, kbnUrl, savedObjectsAPI, { find: true, get: true, cache });
});
