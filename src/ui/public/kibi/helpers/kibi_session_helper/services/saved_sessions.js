import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import 'ui/kibi/helpers/kibi_session_helper/services/_saved_session';
import uiModules from 'ui/modules';
import registry from 'plugins/kibana/management/saved_object_registry';

registry.register({
  service: 'savedSessions',
  title: 'sessions'
});

// This is the only thing that gets injected into controllers
uiModules
.get('ui/kibi/helpers/kibi_session_helper/services/saved_sessions')
.service('savedSessions', function (savedObjectsAPI, Private, SavedSession, kbnIndex, esAdmin, kbnUrl) {
  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI
  };
  return new SavedObjectLoader(SavedSession, kbnIndex, esAdmin, kbnUrl, options);
});
