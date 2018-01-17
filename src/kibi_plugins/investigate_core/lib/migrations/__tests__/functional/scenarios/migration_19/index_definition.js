module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        'kibi:countFetchingStrategyDashboards': {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256
            }
          }
        },
        'kibi:countFetchingStrategyRelationalFilters': {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256
            }
          }
        },
        'kibi:xxx': {
          type: 'integer'
        }
      }
    }
  }
};
