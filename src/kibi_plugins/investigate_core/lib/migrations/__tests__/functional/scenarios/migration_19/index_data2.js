/**
 * Defines the following objects:
 *
 * - a configuration without
 *   siren:countFetchingStrategyDashboards and siren:countFetchingStrategyRelationalFilters properties
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
    'siren:xxx': 10
  }
];
