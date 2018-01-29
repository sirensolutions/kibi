/**
 * Defines the following objects:
 *
 * - a mappings object *without* a refreshInterval object
 */
module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    dashboard: {
      properties: {
        description: {
          type:'text'
        },
        hits: {
          type:'integer'
        },
        kibanaSavedObjectMeta: {
          properties: {
            searchSourceJSON: {
              type:'text'
            }
          }
        },
        optionsJSON: {
          type:'text'
        },
        panelsJSON: {
          type:'text'
        },
        priority: {
          type:'long'
        },
        savedSearchId: {
          type:'text'
        },
        timeFrom: {
          type:'text'
        },
        timeMode: {
          type:'text',
          fields: {
            keyword: {
              type:'keyword',
              ignore_above:256
            }
          }
        },
        timeRestore: {
          type:'boolean'
        },
        timeTo: {
          type:'text'
        },
        title: {
          type:'text'
        },
        uiStateJSON: {
          type:'text'
        },
        version: {
          type:'integer'
        }
      }
    }
  }
};
