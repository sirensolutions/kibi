define(function (require) {

  return function (Promise) {

    const timeFilterMock = {
      get: function (indexPattern) {
        if (indexPattern.id === 'articles') {
          return {
            range: {
              'fake_field': {
                gte: 20,
                lte: 40
              }
            }
          };
        } else {
          return null;
        }
      }
    };

    return timeFilterMock;
  };
});
