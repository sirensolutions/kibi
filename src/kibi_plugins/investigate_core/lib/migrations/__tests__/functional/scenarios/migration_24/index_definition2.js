/**
 * Defines the following objects:
 *
 * - a mappings object *without* a sourceFilters object
 */
module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    'index-pattern': {
      properties: {
        title: {
          type:'text'
        }
      }
    }
  }
};
