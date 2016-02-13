define(function (require) {

  var fakeIndexes = {
    article: {
      id: 'article'
    },
    company: {
      id: 'company'
    },
    'time-testing-3': {
      id: 'time-testing-3'
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
