import { pkg } from '~/src/utils/package_json';

/**
 * An empty .kibi index.
 */
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
  }
];
