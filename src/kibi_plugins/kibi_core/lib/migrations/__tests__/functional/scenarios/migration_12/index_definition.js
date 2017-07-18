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
        'kibi:defaultDashboardTitle': {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    },
    dashboard: {
      properties: {
        title: {
          type: 'string',
        }
      }
    }
  }
};
