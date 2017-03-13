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
  }
};
