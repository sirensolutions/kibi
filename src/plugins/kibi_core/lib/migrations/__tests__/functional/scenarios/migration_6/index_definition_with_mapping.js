module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        buildNum: {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    },
    url: {
      properties: {
        sirenSession: {
          type: 'object',
          enabled: false
        }
      }
    }
  }
};
