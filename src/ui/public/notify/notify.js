define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var modules = require('ui/modules');
  var module = modules.get('kibana/notify');
  var errors = require('ui/notify/errors');
  var Notifier = require('kibie/notify/notifier');
  var rootNotifier = new Notifier();

  require('ui/notify/directives');

  module.factory('createNotifier', function (config) {
    return function (opts) {
      return new Notifier(opts);
    };
  });

  module.factory('Notifier', function () {
    return Notifier;
  });

  module.run(function ($interval, $rootScope, config) {
    var configInitListener = $rootScope.$on('init:config', function () {
      applyConfig();
      configInitListener();
    });

    $rootScope.$on('change:config', applyConfig);

    Notifier.applyConfig({
      setInterval: $interval,
      clearInterval: $interval.cancel
    });

    function applyConfig() {
      Notifier.applyConfig({
        // kibi: set the awesomeDemoMode and shieldAuthorizationWarning flag
        awesomeDemoMode: config.get('kibi:awesomeDemoMode'),
        shieldAuthorizationWarning: config.get('kibi:shieldAuthorizationWarning'),
        // kibi: end
        errorLifetime: config.get('notifications:lifetime:error'),
        warningLifetime: config.get('notifications:lifetime:warning'),
        infoLifetime: config.get('notifications:lifetime:info')
      });
    }
  });

  /**
  * Global Angular exception handler (NOT JUST UNCAUGHT EXCEPTIONS)
  */
  // modules
  //   .get('exceptionOverride')
  //   .factory('$exceptionHandler', function () {
  //     return function (exception, cause) {
  //       rootNotifier.fatal(exception, cause);
  //     };
  //   });

  window.onerror = function (err, url, line) {
    rootNotifier.fatal(new Error(err + ' (' + url + ':' + line + ')'));
    return true;
  };

  return rootNotifier;
});
