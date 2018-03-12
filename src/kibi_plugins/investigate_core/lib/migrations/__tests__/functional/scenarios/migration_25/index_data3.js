/**
 * Defines the following objects:
 *
 * - a configuration with some siren:* advanced settings saved
 *   and some deprecated siren: advanced settings.
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
    buildNum: '5432',
    'siren:relations': '{ "version": "2", "deepObj": { "a" : "b" } }',
    'dateFormat:tz': 'UTC',
    'siren:zoom': 0.8,
    'siren:enableAllDashboardsCounts': true,
    'siren:shieldAuthorizationWarning': true
  }
];