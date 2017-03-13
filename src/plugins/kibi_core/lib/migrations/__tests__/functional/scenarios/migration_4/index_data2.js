/*eslint max-len: 0*/
import requirefrom from 'requirefrom';
const fromRoot = requirefrom('src/utils')('fromRoot');
const packageJson = require(fromRoot('package.json'));

/**
 * Defines the following objects:
 *
 * - a configuration with a kibi:relations of version 2
 */
module.exports = [
  {
    'index': {
      '_index': '.kibi2',
      '_type': 'config',
      '_id': packageJson.kibi_version
    }
  },
  {
    'buildNum': packageJson.build.number,
    'dateFormat:tz': 'UTC',
    'kibi:relations': '{\"version\":2,\"relationsDashboards\":[],\"relationsDashboardsSerialized\":{},\"relationsIndices\":[],\"relationsIndicesSerialized\":{}}'
  }
];
