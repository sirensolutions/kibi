module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        'kibanaSavedObjectMeta': {
          type: 'object'
        }
      }
    }
  }
};
