/**
 * Defines the following objects:
 *
 * - three old configurations, one without buildNum
 */
export default [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: '5.2.2'
    }
  },
  {
    buildNum: '123',
    'dateFormat:tz': 'UTC'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: '5.8.2'
    }
  },
  {
    'dateFormat:tz': 'Europe/Oslo'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: '5.4.2'
    }
  },
  {
    buildNum: '1',
    'dateFormat:tz': 'Europe/Rome'
  }
];
