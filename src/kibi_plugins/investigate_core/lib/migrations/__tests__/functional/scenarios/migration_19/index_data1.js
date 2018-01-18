/**
 * Defines the following objects:
 *
 * - a configuration with a
 *   siren:countFetchingStrategyDashboards and siren:countFetchingStrategyRelationalFilters properties
 *   with values which require an upgrade (missing mandatory name property)
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
    'siren:countFetchingStrategyDashboards': '{"parallelRequests": 1, "retryOnError": 1, "batchSize": 2}',
    'siren:countFetchingStrategyRelationalFilters': '{"parallelRequests": 1, "retryOnError": 1, "batchSize": 2}',
    'siren:xxx': 10
  }
];


