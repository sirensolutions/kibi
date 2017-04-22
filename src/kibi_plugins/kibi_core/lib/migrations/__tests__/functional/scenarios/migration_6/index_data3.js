import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

export default [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: packageJson.kibi_version
    }
  },
  {
    buildNum: packageJson.build.number,
    'dateFormat:tz': 'UTC'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'url',
      _id: '1'
    }
  },
  {
    kibiSession: {}
  }
];
