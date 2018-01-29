/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a configuration without a siren:relations field.
 */
module.exports = [
  {
    index: {
      _index: '.siren2',
      _type: 'config',
      _id: 'siren'
    }
  },
  {
    field: 'value'
  }
];
