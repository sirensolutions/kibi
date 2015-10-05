define(function (require) {
  return function KibiStateHelperFactory($rootScope, globalState, savedDashboards, $location, $timeout) {
    var _ = require('lodash');

    /*
     * Helper class to manage the kibi state using globalState.k object
     * Note: use just letters for property names to make this object as small as possible
     */
    function KibiStateHelper() {
      this._init();
    }

    /**
     * Returns true if the query is:
     * - a query_string
     * - a wildcard only
     * - analyze_wildcard is set to true
     */
    KibiStateHelper.prototype.isAnalyzedWildcardQueryString = function (query) {
      return query &&
        query.query_string &&
        query.query_string.query === '*' &&
        query.query_string.analyze_wildcard === true;
    }

    KibiStateHelper.prototype._updateTimeForOneDashboard = function (dashboard) {
      var skipGlobalStateSave = true;
      if (dashboard.timeRestore === true) {
        this.saveTimeForDashboardId(dashboard.id, dashboard.timeFrom, dashboard.timeTo, skipGlobalStateSave);
      } else {
        this.removeTimeForDashboardId(dashboard.id, skipGlobalStateSave);
      }
    };

    KibiStateHelper.prototype._updateTimeForAllDashboards = function () {
      var self = this;
      savedDashboards.find().then(function (resp) {
        if (resp.hits) {
          _.each(resp.hits, function (dashboard) {
            self._updateTimeForOneDashboard(dashboard);
          });
        }
        globalState.save();
      });
    };

    KibiStateHelper.prototype._setTimeFromGlobalState = function () {
      var self = this;
      var currentDashboardId;
      var currentPath = $location.path();
      if (currentPath && currentPath.indexOf('/dashboard/') === 0) {
        currentDashboardId = currentPath.replace('/dashboard/', '');
      }
      if (currentDashboardId) {
        $timeout(function () {
          self.saveTimeForDashboardId(currentDashboardId, globalState.time.from, globalState.time.to);
        });
      }
    };

    KibiStateHelper.prototype._init = function () {
      var self = this;
      if (!globalState.k) {
        globalState.k = {
          g:{}, // will hold information about selected dashboards in each group
          q:{}, // will hold queries per dashboard
          f:{}, // will hold filters per dashboard
          t:{}  // will hold time per dashboard
        };
        globalState.save();
      }

      $rootScope.$on('kibi:dashboard:changed', function (event, dashboardId) {
        savedDashboards.get(dashboardId).then(function (savedDashboard) {
          self._updateTimeForOneDashboard(savedDashboard);
          globalState.save();
        });
      });

      //NOTE: check if a timefilter has been set into the URL at startup
      var off = $rootScope.$on('$routeChangeSuccess', function () {
        $timeout(function () {
          if (globalState.time) {
            self._setTimeFromGlobalState();
          }
          off();
        });
      });

      // below listener on globalState is needed to react when the global time is changed by the user
      // either directly in time widget or by clicking on histogram chart etc
      globalState.on('save_with_changes', function (diff) {
        if (diff.indexOf('time') !== -1) {
          self._setTimeFromGlobalState();
        }
      });

      this._updateTimeForAllDashboards();
    };

    KibiStateHelper.prototype.saveSelectedDashboardId = function (groupId, dashboardId) {
      globalState.k.g[groupId] = dashboardId;
      globalState.save();
    };

    KibiStateHelper.prototype.getSelectedDashboardId = function (groupId) {
      return globalState.k.g[groupId];
    };

    KibiStateHelper.prototype.saveQueryForDashboardId = function (dashboardId, query) {
      if (query) {
        if (!this.isAnalyzedWildcardQueryString(query)) {
          globalState.k.q[dashboardId] = query;
        } else {
          // store '*' instead the full query to make it more compact as this is very common query
          globalState.k.q[dashboardId] = '*';
        }
      } else {
        delete globalState.k.q[dashboardId];
      }
      globalState.save();
    };

    KibiStateHelper.prototype.getQueryForDashboardId = function (dashboardId) {
      if (globalState.k.q[dashboardId] && globalState.k.q[dashboardId] !== '*') {
        return globalState.k.q[dashboardId];
      } else if (globalState.k.q[dashboardId] && globalState.k.q[dashboardId] === '*') {
        // if '*' was stored make it again full query
        return {
          query_string: {
            analyze_wildcard: true,
            query: '*'
          }
        };
      }
    };

    KibiStateHelper.prototype.saveFiltersForDashboardId = function (dashboardId, filters) {
      if (!dashboardId) {
        return;
      }
      if (filters && filters.length > 0) {
        globalState.k.f[dashboardId] = filters;
      } else {
        // do NOT delete - instead store empty array
        // in other case the previous filters will be restored
        globalState.k.f[dashboardId] = [];
      }
      globalState.save();
    };

    KibiStateHelper.prototype.getFiltersForDashboardId = function (dashboardId) {
      var filters =  globalState.k.f[dashboardId];
      // add also pinned filters which are stored in global state
      if (filters && globalState.filters) {
        return filters.concat(globalState.filters);
      } else if (globalState.filters && globalState.filters.length > 0) {
        return globalState.filters;
      }
      return filters;
    };


    KibiStateHelper.prototype.removeTimeForDashboardId = function (dashboardId, skipGlobalStateSave) {
      delete globalState.k.t[dashboardId];
      if (!skipGlobalStateSave) {
        globalState.save();
      }
    };

    KibiStateHelper.prototype.saveTimeForDashboardId = function (dashboardId, from, to, skipGlobalStateSave) {
      globalState.k.t[dashboardId] = {
        f: from,
        t: to
      };
      if (!skipGlobalStateSave) {
        globalState.save();
      }
    };

    KibiStateHelper.prototype.getTimeForDashboardId = function (dashboardId) {
      if (globalState.k.t[dashboardId]) {
        return {
          from: globalState.k.t[dashboardId].f,
          to: globalState.k.t[dashboardId].t
        };
      }
      return null;
    };


    return new KibiStateHelper();
  };
});
