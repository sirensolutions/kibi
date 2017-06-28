import registry from 'ui/registry/navbar_extensions';

registry.register(function (kibiState) {
  return {
    appName: 'dashboard',
    key: 'reset',
    order: 1,
    run() {
      kibiState.resetFiltersQueriesTimes(kibiState._getCurrentDashboardId());
    },
    tooltip() {
      return 'Reset the time, filters, and queries from this dashboard to their default saved state';
    },
    testId: 'reset'
  };
});
