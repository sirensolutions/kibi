define(function (require) {

  var fakeIndexes = {
    a: {
      id: 'a'
    },
    b: {
      id: 'b'
    },
    c: {
      id: 'c'
    },
    d: {
      id: 'd'
    },
    e: {
      id: 'e'
    }
  };

  return function (Promise) {

    var indexPatternsMock = {
      get: function (id) {
        if (fakeIndexes[id]) {
          return Promise.resolve(fakeIndexes[id]);
        } else {
          return Promise.reject(new Error('Could not get index pattern [' + id + ']'));
        }
      }
    };

    return indexPatternsMock;
  };
});
