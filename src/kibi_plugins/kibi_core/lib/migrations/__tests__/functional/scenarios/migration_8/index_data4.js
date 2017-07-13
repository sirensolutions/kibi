/**
 * Defines the following objects:
 *
 * - a configuration with an empty kibi:relations
 */
module.exports = [
  {
    index: {
      _index: '.kibi4',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    'dateFormat:tz': 'UTC',
    'kibi:relations': ''
  }
];
