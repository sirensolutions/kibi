import { uiModules } from 'ui/modules';
import { Notifier as uiNotifier } from 'ui/notify/notifier'; // kibi: import stock notifier
import { Notifier } from 'kibie/notify/notifier'; // kibi: import ee notifier
import 'ui/notify/directives';
import { metadata } from 'ui/metadata';

const module = uiModules.get('kibana/notify');
export const notify = new Notifier();
export { Notifier } from 'ui/notify/notifier';

module.factory('createNotifier', function () {
  return function (opts) {
    return new Notifier(opts);
  };
});

module.factory('Notifier', function () {
  return Notifier;
});

// teach Notifier how to use angular interval services
module.run(function (config, $interval, $compile) {
  // kibi: do this for all notifiers ...
  for (const Class of [Notifier, uiNotifier]) {
    Class.applyConfig({
      setInterval: $interval,
      clearInterval: $interval.cancel
    });
    applyConfig(config);
    Class.$compile = $compile;
  }
  // kibi: end
});

// if kibana is not included then the notify service can't
// expect access to config (since it's dependent on kibana)
if (!!metadata.kbnIndex) {
  require('ui/config');
  module.run(function (config) {
    config.watchAll(() => applyConfig(config));
  });
}

function applyConfig(config) {
  const authWarningKey = 'kibi:shieldAuthorizationWarning'; // kibi: configuration key
  Notifier.applyConfig({
    // kibi: set the awesomeDemoMode and shieldAuthorizationWarning flag
    awesomeDemoMode: config.get('kibi:awesomeDemoMode'),
    shieldAuthorizationWarning: config.isDeclared(authWarningKey) ? config.get(authWarningKey) : true,
    // kibi: end
    bannerLifetime: config.get('notifications:lifetime:banner'),
    errorLifetime: config.get('notifications:lifetime:error'),
    warningLifetime: config.get('notifications:lifetime:warning'),
    infoLifetime: config.get('notifications:lifetime:info')
  });
  notify.banner(config.get('notifications:banner'));
}

window.onerror = function (err, url, line) {
  notify.fatal(new Error(err + ' (' + url + ':' + line + ')'));
  return true;
};

if (window.addEventListener) {
  const notifier = new Notifier({
    location: 'Promise'
  });

  window.addEventListener('unhandledrejection', function (e) {
    notifier.log(`Detected an unhandled Promise rejection.\n${e.reason}`);
  });
}
