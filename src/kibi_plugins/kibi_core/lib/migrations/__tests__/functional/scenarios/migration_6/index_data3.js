import { pkg } from '~/src/utils/package_json';

export default [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: pkg.kibi_version
    }
  },
  {
    buildNum: pkg.build.number,
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
