define(function (require) {
  return function SearchLooperService($rootScope, Private, Promise, Notifier) {
    var fetch = Private(require('components/courier/fetch/fetch'));
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var requestQueue = Private(require('components/courier/_request_queue'));

    var Looper = Private(require('components/courier/looper/_looper'));
    var notif = new Notifier({ location: 'Search Looper' });

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var searchLooper = new Looper(null, function () {

      // kibi emit event so directives can also have an idea that content was updated (or reloaded by autorefresh)
      $rootScope.$emit('kibi:autorefresh');

      return fetch.these(
        requestQueue.getInactive(searchStrategy)
      );
    });

    searchLooper.onHastyLoop = function () {
      notif.warning('Skipping search attempt because previous search request has not completed');
    };

    return searchLooper;
  };
});
