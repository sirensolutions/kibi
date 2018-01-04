module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        'sourceFiltering': {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    }
  }
};
