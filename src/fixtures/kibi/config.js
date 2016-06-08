define(function (require) {

  return function () {
    var keys = {};
    return {
      get: function (key) { return keys[key]; },
      set: function (key, value) { keys[key] = value; }
    };
  };
});
