import 'plugins/kibi_core/management/sections/kibi_queries/services/_saved_query';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedQueryRegister from 'plugins/kibi_core/management/sections/kibi_queries/services/saved_query_register';

savedObjectRegistry.register(savedQueryRegister);

// Register this service with the saved object registry so it can be edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedQueries',
  title: 'queries'
});

// This is the only thing that gets injected into controllers
uiModules
.get('queries_editor/services/saved_queries')
.service('savedQueries', function (savedObjectsAPI, Private, SavedQuery, kbnIndex, esAdmin, kbnUrl) {
  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI
  };
  const savedQueryLoader = new SavedObjectLoader(SavedQuery, kbnIndex, esAdmin, kbnUrl, options);

  // Customize loader properties since adding an 's' on type doesn't work for type 'query' .
  savedQueryLoader.loaderProperties = {
    name: 'queries',
    noun: 'Query',
    nouns: 'queries'
  };

  savedQueryLoader.urlFor = function (id) {
    return kbnUrl.eval('#/management/kibana/queries/{{id}}', { id: id });
  };

  return savedQueryLoader;
});
