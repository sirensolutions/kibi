/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a visualization with a searchSourceJSON
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'vis'
    }
  },
  {
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filters":{}, "source":{"include":"rnews:articleBody","exclude":"rnews:companyBody"}}'
    }
  }
];
