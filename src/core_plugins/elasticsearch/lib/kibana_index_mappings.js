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
  // siren: added mappings for the session object
  url: {
    properties: {
      sirenSession: {
        type: 'object',
        enabled: false
      }
    }
  },
  // siren: end
  server: {
    properties: {
      uuid: {
        type: 'keyword'
      }
    }
  }
};
