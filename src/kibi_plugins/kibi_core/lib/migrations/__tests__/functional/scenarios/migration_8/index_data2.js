/*eslint max-len: 0*/
import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

/**
 * Defines the following objects:
 *
 * - a configuration with a kibi:relations of version 2
 */
module.exports = [
  {
    index: {
      _index: '.kibi2',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    buildNum: packageJson.build.number,
    'dateFormat:tz': 'UTC',
    'kibi:relations': '{\"version\":2,\"relationsDashboards\":[],\"relationsDashboardsSerialized\":{},\"relationsIndices\":[],\"relationsIndicesSerialized\":{}}'
  }
];
