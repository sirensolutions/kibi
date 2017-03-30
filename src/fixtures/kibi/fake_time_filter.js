define(function (require) {

  return function (Promise) {

    const timeFilterMock = {
      get: function (indexPattern) {
        if (indexPattern.id === 'time-testing-3' || indexPattern.id === 'time-testing-4') {
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
