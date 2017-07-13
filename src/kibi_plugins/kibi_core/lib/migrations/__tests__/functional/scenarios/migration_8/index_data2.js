/*eslint max-len: 0*/

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
    'dateFormat:tz': 'UTC',
    'kibi:relations': '{\"version\":2,\"relationsDashboards\":[],\"relationsDashboardsSerialized\":{},\"relationsIndices\":[],\"relationsIndicesSerialized\":{}}'
  }
];
