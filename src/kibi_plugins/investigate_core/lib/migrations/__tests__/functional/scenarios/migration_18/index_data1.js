/**
 * Defines the following objects:
 *
 * - a configuration with a kibi:relations and kibi:enableAllDashboardsCounts
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
    buildNum: '12345',
    'dateFormat:tz': 'UTC',
    'kibi:relations': '{ "version": "2", "deepObj": { "a" : "b" } }',
    'kibi:enableAllDashboardsCounts': true
  }
];