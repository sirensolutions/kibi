define(function (require) {

  return function (Private) {
    const defaults = Private(require('ui/config/defaults'));
    const keys = {};

    return {
      get: function (key) {
        if (!keys[key]) {
          const def = defaults[key];
          if (def) {
            if (def.type === 'json') {
              return JSON.parse(def.value);
            }
            return def.value;
          }
        }
        return keys[key];
      },
      set: function (key, value) {
        keys[key] = value;
      }
    };
  };
});
