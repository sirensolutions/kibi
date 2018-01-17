/**
 * Defines the following objects:
 *
 * - a configuration with
 *   siren:countFetchingStrategyDashboards and siren:countFetchingStrategyRelationalFilters properties
 *   which do not require a migration
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'siren'
    }
  },
  {
    'siren:countFetchingStrategyDashboards': '{"name":"dashStrategy","parallelRequests": 1, "retryOnError": 1, "batchSize": 2}',
    'siren:countFetchingStrategyRelationalFilters': '{"name":"buttonStrategy","parallelRequests": 1, "retryOnError": 1, "batchSize": 2}',
    'siren:xxx': 10
  }
];
