import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

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
      _id: packageJson.kibi_version
    }
  },
  {
    buildNum: packageJson.build.number,
    'dateFormat:tz': 'UTC',
    'kibi:relations': ''
  }
];
