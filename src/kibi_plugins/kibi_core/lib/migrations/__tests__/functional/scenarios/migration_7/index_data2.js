import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

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
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    'dateFormat:tz': 'UTC'
  }
];
