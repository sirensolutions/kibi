import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import 'plugins/kibi_core/saved_objects/dashboard_groups/_saved_dashboard_group';
import register from 'plugins/kibi_core/saved_objects/dashboard_groups/register';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';

SavedObjectRegistryProvider.register(register);

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedDashboardGroups',
  title: 'dashboardgroups'
});

// This is the only thing that gets injected into controllers
uiModules
.get('kibi_core/saved_objects/dashboard_groups')
.service('savedDashboardGroups', function (savedObjectsAPI, Private, SavedDashboardGroup, kbnIndex, esAdmin, kbnUrl) {
  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI,
    mapHit(source) {
      source.dashboards = JSON.parse(source.dashboards);
    }
  };
  const savedDashboardGroupLoader = new SavedObjectLoader(SavedDashboardGroup, kbnIndex, esAdmin, kbnUrl, options);

  savedDashboardGroupLoader.urlFor = function (id) {
    return kbnUrl.eval('#/management/siren/objects/savedDashboardGroups/{{id}}', { id });
  };

  return savedDashboardGroupLoader;
});
