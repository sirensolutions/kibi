import { pkg } from '~/src/utils/package_json';

/**
 * Defines the following objects:
 *
 * - an old configuration
 * - a new configuration
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
  },
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    'dateFormat:tz': 'UTC'
  }
];
