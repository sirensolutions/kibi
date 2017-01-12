import 'plugins/kibana/dashboard/services/_saved_dashboard';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import cacheProvider from 'ui/kibi/helpers/cache_helper';

// bring in the factory


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
  const cache = Private(cacheProvider);
  return new SavedObjectLoader(SavedDashboard, kbnIndex, esAdmin, kbnUrl, savedObjectsAPI, { find: true, cache });
});
