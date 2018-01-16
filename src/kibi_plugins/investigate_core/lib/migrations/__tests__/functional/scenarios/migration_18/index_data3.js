/**
 * Defines the following objects:
 *
 * - a configuration with some kibi:* advanced settings saved
 *   and some deprecated kibi: advanced settings.
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
    'kibi:relations': '{ "version": "2", "deepObj": { "a" : "b" } }',
    'kibi:enableAllDashboardsCounts': true,
    'kibi:joinLimit': '100',
    'kibi:deprecated': true
  }
];