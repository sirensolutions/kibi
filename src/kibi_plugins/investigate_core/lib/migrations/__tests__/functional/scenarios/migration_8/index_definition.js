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
        },
        'kibi:relations': {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    }
  }
};
