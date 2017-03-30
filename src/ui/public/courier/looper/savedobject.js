define(function (require) {
  return function SavedObjectLooperService(Private) {
    const fetch = Private(require('ui/courier/fetch/fetch'));
    const Looper = Private(require('ui/courier/looper/_looper'));
    const strategy = Private(require('ui/courier/fetch/strategy/savedobject'));

    /**
     * The Looper which will manage the saved objects fetch interval
     * @type {Looper}
     */
    return new Looper(1500, function () {
      fetch.fetchQueued(strategy);
    });
  };
});
