/**
 * Defines the following objects:
 *
 * - a configuration with no siren:* advanced settings saved.
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
    buildNum: '54321',
    'dateFormat:tz': 'UTC',
    'foo': 'bar',
    'isTrue': true
  }
];