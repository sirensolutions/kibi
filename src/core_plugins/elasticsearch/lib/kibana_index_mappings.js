export const mappings = {
  // kibi: we're defining an explicit mapping on version to avoid conflicts occurring when a plugin loads saved objects from JSON (which
  // would create an implicit mapping of `version` to long).
  _default_: {
    properties: {
      version: {
        type: 'integer'
      }
    }
  },
  // kibi: removed mapping for config.buildNum as in Kibi config object is a singleton
  // kibi: added mappings for the session object
  url: {
    properties: {
      sirenSession: {
        type: 'object',
        enabled: false
      }
    }
  },
  // kibi: end
  server: {
    properties: {
      uuid: {
        type: 'keyword'
      }
    }
  }
};
