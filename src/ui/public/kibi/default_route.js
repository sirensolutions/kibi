define(function (require) {

  var chrome = require('ui/chrome');
  var routes = require('ui/routes');

  routes.when('/default', {
    resolve: {
      defaultPath: function ($location, $window, Private) {
        var urlHelper = Private(require('ui/kibi/helpers/url_helper'));
        var app = chrome.getApp();
        var tabs = chrome.getTabs();

        urlHelper.getInitialPath(app, tabs).then(function (path) {
          if (path.indexOf('http') === 0) {
            $window.location.href = path;
          } else {
            $location.path(path);
          }
        }).catch(function (err) {
          // fallback to what kibana would do by default
          $location.path(`/${chrome.getInjected('kbnDefaultAppId', 'discover')}`);
        });
      }
    }
  });
});
