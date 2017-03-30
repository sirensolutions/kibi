import registry from 'ui/registry/navbar_extensions';

registry.register(function (kibiState) {
  return {
    appName: 'dashboard',
    key: 'reset',
    order: 1,
    run() {
      kibiState.resetFiltersQueriesTimes();
    },
    tooltip() {
      return 'Reset the time, filters, and queries from all dashboards to their default saved state';
    },
    testId: 'reset'
  };
});
