import 'plugins/kibana/dashboard/services/_saved_dashboard';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';

// Register this service with the saved object registry so it can be
// edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedDashboards',
  title: 'dashboards'
});

// This is the only thing that gets injected into controllers
uiModules
.get('app/dashboard')
.service('savedDashboards', function (savedObjectsAPI, Private, SavedDashboard, kbnIndex, esAdmin, kbnUrl) {
  const options = {
    caching: {
      find: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI
  };
  return new SavedObjectLoader(SavedDashboard, kbnIndex, esAdmin, kbnUrl, options);
});
