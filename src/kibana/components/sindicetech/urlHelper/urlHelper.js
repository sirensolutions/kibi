define(function (require) {
  return function UrlHelperFactory(Private, $location, $route, sessionStorage, savedDashboards, savedSearches, Promise, configFile) {
    var rison = require('utils/rison');
    var _ = require('lodash');
    var apps = Private(require('registry/apps'));
    var kibiStateHelper    = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));


    var defaultApp = _.find(apps, function (app) {
      return app.id === configFile.default_app_id;
    });


    function UrlHelper() {
    }

    // get just the join filter from the url
    UrlHelper.prototype.getJoinFilter = function () {
      var s = $location.search();
      var a = s._a;
      var ret = null;
      if (a) {
        var decodedA = rison.decode(a);
        if (decodedA.filters) {
          var index = -1;
          _.each(decodedA.filters, function (f, i) {
            if (f.join) {
              ret = f;
              return false;
            }
          });
        }
      }
      return ret;
    };

    UrlHelper.prototype.removeJoinFilter = function () {
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (decodedA.filters) {
          var index = -1;
          _.each(decodedA.filters, function (f, i) {
            if (f.join) {
              index = i;
              return false;
            }
          });
          if (index !== -1) {
            decodedA.filters.splice(index, 1);
          }
          var encodedA = rison.encode(decodedA);
          $location.search('_a', encodedA);
        }
      }
    };

    UrlHelper.prototype.addFilter = function (filter) {
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (!decodedA.filters) {
          decodedA.filters = [];
        }

        // here if there is a relational filter it should be replaced
        if (filter.join) {
          // replace
          var index = -1;
          _.each(decodedA.filters, function (f, i) {
            if (f.join) {
              index = i;
              return false;
            }
          });
          if (index !== -1) {
            // exists so replace
            decodedA.filters[index] = filter;
          } else {
            // do not exists so add
            decodedA.filters.push(filter);
          }
        } else {
          // add
          decodedA.filters.push(filter);
        }

        delete decodedA.panels;
        var encodedA = rison.encode(decodedA);
        $location.search('_a', encodedA);
      }
    };

    UrlHelper.prototype.switchDashboard = function (dashboardId) {
      if (dashboardId) {
        $location.path('dashboard/' + dashboardId);
        $route.reload();
      }
    };

    UrlHelper.prototype.replaceFiltersAndQueryAndTime = function (filters, query, time) {
      var s = $location.search();
      var a = s._a;
      var g = s._g;
      if (a) {
        var decodedA = rison.decode(a);
        if (filters) {
          decodedA.filters = filters;
        } else {
          decodedA.filters = [];
        }

        // replace only if the query object is present else remove it
        if (query === undefined) {
          delete decodedA.query;
        } else {
          decodedA.query = query;
        }

        delete decodedA.panels;
        var encodedA = rison.encode(decodedA);
        $location.search('_a', encodedA);
      }

      if (g) {
        var decodedG = rison.decode(g);
        if (time) {
          if (!decodedG.time) {
            decodedG.time = {};
          }
          decodedG.time.from = time.from;
          decodedG.time.to = time.to;

          var encodedG = rison.encode(decodedG);
          $location.search('_g', encodedG);
        }
      }
    };


    UrlHelper.prototype.isItDashboardUrl = function () {
      return $location.path() && $location.path().indexOf('/dashboard') === 0;
    };

    UrlHelper.prototype.getCurrentDashboardId = function () {
      var currentDashboardId;
      var currentPath = $location.path();
      if (currentPath.indexOf('/dashboard/') === 0) {
        currentDashboardId = currentPath.replace('/dashboard/', '');
      }
      return currentDashboardId;
    };


    UrlHelper.prototype.getIndexToDashboardMap = function () {
      return new Promise(function (fulfill, reject) {
        savedDashboards.find().then(function (resp) {
          var promises = [];
          _.each(resp.hits, function (dashboard) {
            if (dashboard.savedSearchId) {
              promises.push(
                new Promise(function (resolve, reject) {
                  savedSearches.get(dashboard.savedSearchId).then(function (dashboardSavedSearch) {
                    resolve({
                      dashboardId: dashboard.id,
                      indexId: dashboardSavedSearch.searchSource._state.index.id
                    });
                  });
                })
              );
            }
          });
          Promise.all(promises).then(function (results) {
            fulfill(results);
          });
        });
      });
    };


    UrlHelper.prototype.getRegularFiltersPerIndex = function () {
      var self = this;
      // grab filters here - they have to be in a format { indexId: [], indexId2: [] } without any join filter
      // but filters in kibi state are saved per dashboard
      // so iterate over dashboards check that they have savedSearchId and if they do take the filters
      // return a promise
      return new Promise(function (fulfill, reject) {
        var filters = {};
        self.getIndexToDashboardMap().then(function (results) {
          _.each(results, function (res) {
            var fs = kibiStateHelper.getFiltersForDashboardId(res.dashboardId);
            filters[res.indexId] = _.filter(fs, function (f) {
              return !f.join;
            });
          });
          fulfill(filters);
        });
      });
    };

    UrlHelper.prototype.getQueriesPerIndex = function () {
      var self = this;
      return new Promise(function (fulfill, reject) {
        var queries = {};
        self.getIndexToDashboardMap().then(function (results) {
          _.each(results, function (res) {
            var query = kibiStateHelper.getQueryForDashboardId(res.dashboardId);
            if (query) {
              queries[res.indexId] = query;
            }
          });

          fulfill(queries);
        });
      });
    };


    UrlHelper.prototype.getCurrentDashboardQuery = function () {
      var currentDashboardId = this.getCurrentDashboardId();
      if (!currentDashboardId) {
        return;
      }

      var s = $location.search();
      var a = s._a;

      if (a) {
        var decodedA = rison.decode(a);
        return decodedA.query;
      }
      return null;
    };

    UrlHelper.prototype.getCurrentDashboardFilters = function () {
      var currentDashboardId = this.getCurrentDashboardId();
      if (!currentDashboardId) {
        return;
      }
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (decodedA.filters) {
          return _.filter(decodedA.filters, function (f) {
            return f.meta && f.meta.disabled !== true;
          });
        }
      }
      return null;
    };

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

    UrlHelper.prototype.getInitialPath = function (app) {
      return new Promise(function (fulfill, reject) {
        if (typeof app === 'undefined') {
          app = defaultApp;
          if (typeof app === 'undefined' || app === null || app === false) {
            fulfill('/');
            return;
          }
          app.lastPath = app.rootPath;
        }
        if (app && app.id === 'dashboard' && (app.rootPath === app.lastPath)) {
          if (configFile.default_dashboard_id && configFile.default_dashboard_id !== '') {

            // check that the dashboard exists
            savedDashboards.get(configFile.default_dashboard_id).then(function (savedDashboard) {
              fulfill('/' + app.id + '/' + savedDashboard.id);
            }).catch(function (err) {
              // could not find the specified dashboard, open the first available
              savedDashboards.find().then(function (resp) {
                if (resp.hits && resp.hits.length > 0) {
                  fulfill('/' + app.id + '/' + resp.hits[0].id);
                } else {
                  // no dashboards, display the creation form
                  fulfill('/' + app.id);
                }
              });
            });
          } else {
            fulfill(app.lastPath ? app.lastPath : '/' + app.id);
          }
        } else {
          fulfill(app.lastPath ? app.lastPath : '/' + app.id);
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
