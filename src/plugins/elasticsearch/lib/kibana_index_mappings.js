export const mappings = {
  _default_: {
    properties: {
      version: {
        type: 'integer'
      }
    }
  },
  config: {
    properties: {
      buildNum: {
        type: 'string',
        index: 'not_analyzed'
      }
    }
  },
  // siren: added
  url: {
    properties: {
      sirenSession: {
        type: 'object',
        enabled: false
      }
    }
  }
  // siren: end
};
