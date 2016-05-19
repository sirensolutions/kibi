var _ = require('lodash');

module.exports = function (chrome, internals) {

  chrome.setupAngular = function () {
    var modules = require('ui/modules');
    var kibana = modules.get('kibana');

    _.forOwn(chrome.getInjected(), function (val, name) {
      kibana.value(name, val);
    });

    kibana
    .value('kbnVersion', internals.version)
    .value('kibiVersion', internals.kibiVersion) // kibi: added to manage kibi version
    .value('kibiEnterpriseEnabled', internals.kibiEnterpriseEnabled) // kibi:
    .value('kibiKibanaAnnouncement', internals.kibiKibanaAnnouncement) // kibi:
    .value('buildNum', internals.buildNum)
    .value('buildSha', internals.buildSha)
    .value('sessionId', Date.now())
    .value('esUrl', (function () {
      var a = document.createElement('a');
      a.href = chrome.addBasePath('/elasticsearch');
      return a.href;
    }()))
    .config(chrome.$setupXsrfRequestInterceptor);

    require('../directives')(chrome, internals);

    modules.link(kibana);
  };

};
