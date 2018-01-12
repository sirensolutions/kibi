/**
 * Defines the following objects:
 *
 * - a configuration with an id of 'kibi'
 */
export default [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    foo: 'bar',
    'dateFormat:tz': 'UTC',
    isBool: true,
    isNumber: 1234
  }
];