/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - a visualization with a searchSourceJSON
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'kibi'
    }
  },
  {
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"source\":{\"exclude\":\"rnews:articleBody\"}}"
    }
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'kibi1'
    }
  },
  {
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"source\":{\"include\":\"rnews:companyBody\"}}"
    }
  }
];
