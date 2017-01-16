define(function (require) {
  var intern = require('intern');

  /**
   * Helper for Angular apps.
   *
   * @param remote - A Leadfoot session.
   */
  function AngularHelper(remote) {
    this.remote = remote;
  }

  /**
   * Waits for pending requests to be 0 for the specified period.
   *
   * Whenever possible, prefer the Leadfoot find methods with a timeout rather
   * than this method.
   *
   * @param {Number} period - A period in seconds. Can be set to 0 if the
   * http request is triggered in the same digest cycle as the test action.
   */
  AngularHelper.prototype.waitForPendingRequests = function (period) {
    if (typeof period === 'undefined') {
      // Cover at least one courier loop by default.
      period = 1501;
    }
    return this.remote
    .setExecuteAsyncTimeout(30000)
    .executeAsync(function (period, cb) {
      var $timeout;
      var $browser;
      var $http;
      var start = window.performance.now();
      var check = function () {
        $browser.defer(function () {
          if ($http.pendingRequests.length > 0) {
            start = window.performance.now();
          }
          if (period === 0) {
            return cb(true);
          }
          if ((window.performance.now() - start) >= period) {
            return cb(true);
          }
          return $browser.defer(check);
        });
      };

      var waitForAngular = function () {
        if (!window.angular) {
          return setTimeout(waitForAngular, 250);
        }
        var injector = window.angular.element(document.body).injector();
        $timeout = injector.get('$timeout');
        $browser = injector.get('$browser');
        $http = injector.get('$http');
        $browser.defer(check);
      };
      waitForAngular();
    }, [period]);
  };

  /**
   * Waits for an Angular timeout.
   */
  AngularHelper.prototype.waitForTimeout = function () {
    return this.remote
    .setExecuteAsyncTimeout(30000)
    .executeAsync(function (cb) {
      if (!window.angular) {
        return cb(true);
      }
      var injector = window.angular.element(document.body).injector();
      var $timeout = injector.get('$timeout');
      $timeout(function () {
        cb(true);
      });
    });
  };

  return AngularHelper;

});
