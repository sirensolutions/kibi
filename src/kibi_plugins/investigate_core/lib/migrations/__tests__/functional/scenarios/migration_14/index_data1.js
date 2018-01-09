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
      searchSourceJSON: '{"source":{"exclude":"rnews:articleBody"}}'
    }
  },
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'vis1'
    }
  },
  {
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"source":{"include":"rnews:companyBody"}}'
    }
  }
];
