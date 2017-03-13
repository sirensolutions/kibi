define(function (require) {
  return function SavedObjectLooperService(Private) {
    let fetch = Private(require('ui/courier/fetch/fetch'));
    let Looper = Private(require('ui/courier/looper/_looper'));
    let strategy = Private(require('ui/courier/fetch/strategy/savedobject'));

    /**
     * The Looper which will manage the saved objects fetch interval
     * @type {Looper}
     */
    return new Looper(1500, function () {
      fetch.fetchQueued(strategy);
    });
  };
});
