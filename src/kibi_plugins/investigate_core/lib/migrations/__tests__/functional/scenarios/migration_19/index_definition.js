module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        'kibi:countFetchingStrategyDashboards': {
          type: 'text'
        },
        'kibi:countFetchingStrategyRelationalFilters': {
          type: 'text'
        },
        'kibi:xxx': {
          type: 'integer'
        }
      }
    }
  }
};
