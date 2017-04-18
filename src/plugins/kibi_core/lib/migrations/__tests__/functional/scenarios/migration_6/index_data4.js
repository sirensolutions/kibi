import requirefrom from 'requirefrom';
const fromRoot = requirefrom('src/utils')('fromRoot');
const packageJson = require(fromRoot('package.json'));

export default [
  {
    'index': {
      '_index': '.kibi',
      '_type': 'config',
      '_id': packageJson.kibi_version
    }
  },
  {
    'buildNum': packageJson.build.number,
    'dateFormat:tz': 'UTC'
  },
  {
    'index': {
      '_index': '.kibi',
      '_type': 'url',
      '_id': '1'
    }
  },
  {
    'kibiSession': null
  },
  {
    'index': {
      '_index': '.kibi',
      '_type': 'url',
      '_id': '2'
    }
  },
  {
    'url': 'http://example.com'
  }
];
