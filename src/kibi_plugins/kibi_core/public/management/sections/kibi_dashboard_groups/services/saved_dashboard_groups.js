import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/_saved_dashboard_group';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';

// Register this service with the saved object registry so it can be
// edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedDashboardGroups',
  title: 'dashboardgroups'
});

// This is the only thing that gets injected into controllers
uiModules
.get('dashboard_groups_editor/services/saved_dashboard_groups')
.service('savedDashboardGroups', function (savedObjectsAPI, Private, SavedDashboardGroup, kbnIndex, esAdmin, kbnUrl) {
  const cache = Private(CacheProvider);
  return new SavedObjectLoader(SavedDashboardGroup, kbnIndex, esAdmin, kbnUrl, savedObjectsAPI, { find: true, get: true, cache });
});
