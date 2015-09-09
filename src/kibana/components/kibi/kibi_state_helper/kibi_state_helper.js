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

    KibiStateHelper.prototype._updateTimeForOneDashboard = function (dashboard) {
      var skipGlobalStateSave = true;
      if (dashboard.timeRestore === true) {
        this.saveTimeForDashboardId(dashboard.timeFrom, dashboard.timeTo, dashboard.id, skipGlobalStateSave);
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
      this._updateTimeForAllDashboards();

      $rootScope.$on('kibi:dashboard:changed', function (event, dashboardId) {
        savedDashboards.get(dashboardId).then(function (savedDashboard) {
          self._updateTimeForOneDashboard(savedDashboard);
          globalState.save();
        });
      });

      // below listener on globalState is needed to react when the global time is changed by the user
      // either directly in time widget or by clicking on histogram chart etc
      globalState.on('save_with_changes', function (diff) {
        if (diff.indexOf('time') !== -1) {
          var currentDashboardId;
          var currentPath = $location.path();
          if (currentPath && currentPath.indexOf('/dashboard/') === 0) {
            currentDashboardId = currentPath.replace('/dashboard/', '');
          }
          if (currentDashboardId) {
            $timeout(function () {
              self.saveTimeForDashboardId(globalState.time.from, globalState.time.to, currentDashboardId);
            });
          }
        }
      });

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
        if (!(query.query_string && query.query_string.query && query.query_string.query === '*')) {
          globalState.k.q[dashboardId] = query;
        } else {
          // store '*' instead the full query to make it more compact
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
      }
      return filters;
    };


    KibiStateHelper.prototype.removeTimeForDashboardId = function (dashboardId, skipGlobalStateSave) {
      delete globalState.k.t[dashboardId];
      if (!skipGlobalStateSave) {
        globalState.save();
      }
    };

    KibiStateHelper.prototype.saveTimeForDashboardId = function (from, to, dashboardId, skipGlobalStateSave) {
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
