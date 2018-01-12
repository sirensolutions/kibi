/**
 * Defines the following objects:
 *
 * - a configuration with an id of 'siren'
 */
export default [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'siren'
    }
  },
  {
    foo: 'bar',
    'dateFormat:tz': 'UTC',
    isBool: true,
    isNumber: 1234
  }
];