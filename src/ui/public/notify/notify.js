define(function (require) {
  let _ = require('lodash');
  let $ = require('jquery');
  let modules = require('ui/modules');
  let module = modules.get('kibana/notify');
  let errors = require('ui/notify/errors');
  let Notifier = require('kibie/notify/notifier');
  let rootNotifier = new Notifier();

  require('ui/notify/directives');
  require('ui/directives/truncated');

  module.factory('createNotifier', function () {
    return function (opts) {
      return new Notifier(opts);
    };
  });

  module.factory('Notifier', function () {
    return Notifier;
  });

  // teach Notifier how to use angular interval services
  module.run(function ($interval) {
    Notifier.applyConfig({
      setInterval: $interval,
      clearInterval: $interval.cancel
    });
  });

  module.run(function ($rootScope, $injector) {
    if ($injector.has('config')) {
      let configInitListener = $rootScope.$on('init:config', function () {
        applyConfig();
        configInitListener();
      });

      $rootScope.$on('change:config', applyConfig);

      function applyConfig() {
        const config = $injector.get('config');
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
