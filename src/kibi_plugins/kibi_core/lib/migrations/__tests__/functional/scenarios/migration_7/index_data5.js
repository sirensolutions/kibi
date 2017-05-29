/**
 * Defines the following objects:
 *
 * - a configuration from a SNAPSHOT
 * - a configuration from a release
 */
export default [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: '5.2.2-SNAPSHOT'
    }
  },
  {
    buildNum: '456',
    'dateFormat:tz': 'UTC'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: '5.3.2'
    }
  },
  {
    buildNum: '123',
    'dateFormat:tz': 'new-york'
  }
];
