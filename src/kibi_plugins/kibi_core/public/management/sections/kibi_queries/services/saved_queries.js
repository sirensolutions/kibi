import 'plugins/kibi_core/management/sections/kibi_queries/services/_saved_query';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';

// Register this service with the saved object registry so it can be edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedQueries',
  title: 'queries'
});

// This is the only thing that gets injected into controllers
uiModules
.get('queries_editor/services/saved_queries')
.service('savedQueries', function (savedObjectsAPI, Private, SavedQuery, kbnIndex, esAdmin, kbnUrl) {
  const cache = {
    cache: Private(CacheProvider),
    find: true,
    get: true
  };
  const loaderProperties = {
    name: 'queries',
    noun: 'Query',
    nouns: 'Queries'
  };
  return new SavedObjectLoader(SavedQuery, kbnIndex, esAdmin, kbnUrl, savedObjectsAPI, cache, loaderProperties);
});
