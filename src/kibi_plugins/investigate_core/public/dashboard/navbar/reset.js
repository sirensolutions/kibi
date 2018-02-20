import { NavBarExtensionsRegistryProvider } from 'ui/registry/navbar_extensions';

NavBarExtensionsRegistryProvider.register(function (kibiState) {
  return {
    appName: 'dashboard',
    key: 'reset',
    order: 1,
    run() {
      kibiState.resetFiltersQueriesTimes(kibiState.getCurrentDashboardId());
    },
    tooltip() {
      return 'Reset the time, filters, and queries from this dashboard to their default saved state';
    },
    testId: 'reset'
  };
});
