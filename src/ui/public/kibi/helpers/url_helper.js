define(function (require) {
  var rison = require('ui/utils/rison');
  var _ = require('lodash');

  return function UrlHelperFactory($location, savedDashboards, Promise, kbnDefaultAppId, kibiDefaultDashboardId) {
    function UrlHelper() {
    }

    UrlHelper.prototype.onVisualizeTab = function () {
      return $location.path().indexOf('/visualize/') === 0;
    };

    UrlHelper.prototype.onDashboardTab = function () {
      return $location.path().indexOf('/dashboard/') === 0;
    };

    // TODO tabs should be taken from chrome.getTabs();
    UrlHelper.prototype.getInitialPath = function (app, tabs) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        var defaultApp = _.find(tabs, function (app) {
          return app.id === kbnDefaultAppId;
        });

        if (typeof app === 'undefined') {
          app = defaultApp;

          if (typeof app === 'undefined' || app === null || app === false) {
            fulfill('/');
            return;
          }
          app.rootUrl = app.lastUrl;
        }

        if (app && app.id === 'kibana' && defaultApp && defaultApp.id === 'dashboard') {
          if (kibiDefaultDashboardId && kibiDefaultDashboardId !== '') {
            // check that the dashboard exists
            savedDashboards.get(kibiDefaultDashboardId).then(function (savedDashboard) {
              fulfill('/' + defaultApp.id + '/' + savedDashboard.id);
            }).catch(function (err) {
              // could not find the specified dashboard, open the first available
              savedDashboards.find().then(function (resp) {
                if (resp.hits && resp.hits.length > 0) {
                  fulfill('/' + defaultApp.id + '/' + resp.hits[0].id);
                } else {
                  // no dashboards, display the creation form
                  fulfill('/' + defaultApp.id);
                }
              });
            });
          } else {
            // kibiDefaultDashboardId not set open the first dashboard
            savedDashboards.find().then(function (resp) {
              if (resp.hits && resp.hits.length > 0) {
                fulfill('/' + defaultApp.id + '/' + resp.hits[0].id);
              } else {
                // no dashboards, display the creation form
                fulfill('/' + defaultApp.id);
              }
            });
          }
        } else {
          if (defaultApp) {
            fulfill(defaultApp.lastUrl ? defaultApp.lastUrl : defaultApp.rootUrl);
          } else if (defaultApp === undefined && kbnDefaultAppId) {
            fulfill('/' + kbnDefaultAppId);
          }
        }
      });
    };

    return new UrlHelper();
  };

});
