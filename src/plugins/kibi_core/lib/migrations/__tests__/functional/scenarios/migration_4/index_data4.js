/*eslint max-len: 0*/
import requirefrom from 'requirefrom';
const fromRoot = requirefrom('src/utils')('fromRoot');
const packageJson = require(fromRoot('package.json'));

/**
 * Defines the following objects:
 *
 * - a configuration with an empty kibi:relations
 */
module.exports = [
  {
    'index': {
      '_index': '.kibi4',
      '_type': 'config',
      '_id': packageJson.kibi_version
    }
  },
  {
    'buildNum': packageJson.build.number,
    'dateFormat:tz': 'UTC',
    'kibi:relations': ''
  }
];
