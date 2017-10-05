/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - two config with a 'discover:sampleSize', one of them int other one string
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: 'conf'
    }
  },
  {
    'discover:sampleSize': '50'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: 'conf1'
    }
  },
  {
    'discover:sampleSize': 40
  }
];
