module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        'discover:sampleSize': {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    },
    visualization: {
      properties: {
        visState: {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    }
  }
};