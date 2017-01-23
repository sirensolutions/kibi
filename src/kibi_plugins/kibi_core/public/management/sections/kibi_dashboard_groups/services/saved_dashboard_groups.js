import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/_saved_dashboard_group';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedDashboardGroups from 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups_register';

savedObjectRegistry.register(savedDashboardGroups);

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
    return kbnUrl.eval('#/management/kibana/dashboardgroups/{{id}}', { id: id });
  };

  return savedDashboardGroupLoader;
});
