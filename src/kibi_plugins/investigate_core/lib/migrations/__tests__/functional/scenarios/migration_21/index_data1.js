/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a configuration with a siren:relations containing a relation with an unsupported join type parameter.
 */
module.exports = [
  {
    index: {
      _index: '.siren1',
      _type: 'config',
      _id: 'siren'
    }
  },
  {
    'siren:relations': '{\"relationsIndices\": [{\"indices\": [{\"indexPatternType\": \"\",\"indexPatternId\": \"article\",\"path\": \"companies\"},{\"indexPatternType\": \"\",\"indexPatternId\": \"company\",\"path\": \"id\"}],\"label\": \"connection\",\"id\": \"article//companies/company//id\",\"type\": \"SEARCH_JOIN\"},{\"indices\": [{\"indexPatternType\": \"\",\"indexPatternId\": \"investment\",\"path\": \"investors\"},{\"indexPatternType\": \"\",\"indexPatternId\": \"investor\",\"path\": \"id\"}],\"label\": \"src ip\",\"id\": \"investment//investors/investor//id\"}],\"version\": 2}'
  }
];
