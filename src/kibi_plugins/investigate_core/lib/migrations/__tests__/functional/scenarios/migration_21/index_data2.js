/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a configuration with a siren:relations with the new UUID ids.
 */
module.exports = [
  {
    index: {
      _index: '.siren2',
      _type: 'config',
      _id: 'siren'
    }
  },
  {
    'siren:relations': '{\"relationsIndices\": [{\"indices\": [{\"indexPatternType\": \"\",\"indexPatternId\": \"article\",\"path\": \"companies\"},{\"indexPatternType\": \"\",\"indexPatternId\": \"company\",\"path\": \"id\"}],\"label\": \"connection\",\"id\": \"article//companies/company//id\"},{\"indices\": [{\"indexPatternType\": \"\",\"indexPatternId\": \"investment\",\"path\": \"investors\"},{\"indexPatternType\": \"\",\"indexPatternId\": \"investor\",\"path\": \"id\"}],\"label\": \"src ip\",\"id\": \"investment//investors/investor//id\"}],\"version\": 2}'
  }
];
