define(function (require) {
  var rison = require('ui/utils/rison');
  var _ = require('lodash');

  return function UrlHelperFactory(Private, savedDashboards, Promise, kbnDefaultAppId, kibiDefaultDashboardId) {
    function UrlHelper() {
    }

    UrlHelper.prototype.getPathnameFromUrl = function (url) {
      var start = url.indexOf('#');
      var stop = url.indexOf('?', start) || url.length;
      return url.substring(start, stop);
    };

    UrlHelper.prototype._getParamFromUrl = function (url, paramName, urlStateParamName) {
      var start = url.indexOf('#');
      start = start === -1 ? url.indexOf('?') : url.indexOf('?', start);
      var queryString = url.substring(start + 1);
      var paramPairs = queryString.split('&');
      for (var i = 0; i < paramPairs.length; i++) {
        var pair = paramPairs[i];
        var parts = pair.split('=');
        if (parts[0] === urlStateParamName && parts.length === 2) {
          var decodedA = rison.decode(parts[1]);
          return decodedA[paramName];
        }
      }
    };

    UrlHelper.prototype.getLocalParamFromUrl = function (url, paramName) {
      return this._getParamFromUrl(url, paramName, '_a');
    };
    UrlHelper.prototype.getGlobalParamFromUrl = function (url, paramName) {
      return this._getParamFromUrl(url, paramName, '_g');
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

    UrlHelper.prototype.shouldUpdateCountsBasedOnLocation = function (oldUrl, newUrl) {
      var newPath = this.getPathnameFromUrl(newUrl);
      var oldPath = this.getPathnameFromUrl(oldUrl);

      var newFilters = this.getLocalParamFromUrl(newUrl, 'filters');
      var oldFilters = this.getLocalParamFromUrl(oldUrl, 'filters');
      var newQuery = this.getLocalParamFromUrl(newUrl, 'query');
      var oldQuery = this.getLocalParamFromUrl(oldUrl, 'query');

      var newGlobalFilters = this.getGlobalParamFromUrl(newUrl, 'filters');
      var oldGlobalFilters = this.getGlobalParamFromUrl(oldUrl, 'filters');
      var newGlobalTime = this.getGlobalParamFromUrl(newUrl, 'time');
      var oldGlobalTime = this.getGlobalParamFromUrl(oldUrl, 'time');

      return newPath === oldPath && (
             !_.isEqual(newFilters, oldFilters, true) ||
             !_.isEqual(newQuery, oldQuery, true) ||
             !_.isEqual(newGlobalFilters, oldGlobalFilters, true) ||
             !_.isEqual(newGlobalTime, oldGlobalTime, true));
    };

    return new UrlHelper();
  };

});
