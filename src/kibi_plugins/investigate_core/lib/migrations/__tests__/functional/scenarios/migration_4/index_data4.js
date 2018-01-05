import { pkg } from '~/src/utils/package_json';

/**
 * Defines the following objects:
 *
 * - a configuration with an empty kibi:relations
 */
module.exports = [
  {
    index: {
      _index: '.kibi4',
      _type: 'config',
      _id: pkg.kibi_version
    }
  },
  {
    buildNum: pkg.build.number,
    'dateFormat:tz': 'UTC',
    'kibi:relations': ''
  }
];
