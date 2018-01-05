/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a index pattern without a source filtering
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'index-pattern',
      _id: 'kibi'
    }
  },
  {
    'sourceFilters': '[{"value": "city"}]'
  }
];
