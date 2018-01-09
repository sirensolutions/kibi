/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a index pattern with a source filtering
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'index-pattern',
      _id: 'kibi'
    }
  },
  {
    'sourceFiltering': '{\"all\":{\"exclude\":\"city\",\"include\":\"url\"}}'
  }
];
