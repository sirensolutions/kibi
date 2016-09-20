module.exports = [
  {
    'index': {
      '_index': '.kibi',
      '_type': 'config',
      // kibi: use kibi version instead of kibana's
      '_id': require('../../../../package.json').kibi_version
    }
  },
  {
    'buildNum': require('../../../../package.json').build.number,
    'dateFormat:tz': 'UTC'
  }
];
