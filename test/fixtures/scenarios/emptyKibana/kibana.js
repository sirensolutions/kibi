module.exports = [
  {
    'index': {
      '_index': '.kibi',
      '_type': 'config',
      '_id': require('../../../../package.json').version
    }
  },
  {
    'buildNum': require('../../../../package.json').build.number,
    'dateFormat:tz': 'UTC'
  }
];
