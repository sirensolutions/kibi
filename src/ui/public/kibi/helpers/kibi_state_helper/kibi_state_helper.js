define(function (require) {
  var _ = require('lodash');


  return function KibiStateHelperFactory($rootScope, globalState, savedDashboards, $location, $timeout, Private, createNotifier) {

    var notify = createNotifier({
      location: 'KibiStateHelper'
    });

    var kibiSessionHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_session_helper'));

    /*
     * Helper class to manage the kibi state using globalState.k object
     * Note: use just letters for property names to make this object as small as possible
     */
    function KibiStateHelper() {
      this._init();
    }

    KibiStateHelper.prototype._init = function () {
      var self = this;
      if (!globalState.k) {
        globalState.k = {
          // will hold information about selected dashboards in each group
          g: {},
          // will hold information about each dashboard
          // each dashboard is a map whith following properties:
          //   q:, // queries
          //   f:, // filters
          //   t:  // time
          d: {},
          // will hold ids of enabled relations for relational panel and join_set filter
          j: [],
          // will hold the kibi session id
          s: undefined
        };
        globalState.save();
      };

      $rootScope.$on('kibi:dashboard:changed', function (event, dashboardId) {
        savedDashboards.get(dashboardId).then(function (savedDashboard) {
          self._updateTimeForOneDashboard(savedDashboard);
          globalState.save();
        });
      });

      $rootScope.$on('change:config.kibi:relationalPanel', function (event, enabled) {
        // if enabled === false
        // remove join_set filter
        if (enabled === false) {
          self.removeAllFiltersOfType('join_set');
        }
      });

      $rootScope.$on('kibi:join_set:removed', function () {
        self.removeAllFiltersOfType('join_set');
        self._disableAllRelations();
        $rootScope.$emit('kibi:update-tab-counts');
        $rootScope.$emit('kibi:update-relational-panel');
      });

      $rootScope.$on('kibi:session:changed:deleted', function () {
        kibiSessionHelper.destroy();
        kibiSessionHelper.init();
      });

      //NOTE: check if a timefilter has been set into the URL at startup
      var off = $rootScope.$on('$routeChangeSuccess', function () {
        $timeout(function () {
          if (globalState.time) {
            self._setTimeFromGlobalState();
          }
          if (globalState.k && !globalState.k.s) {
            // no sesion id
            kibiSessionHelper.destroy();
            kibiSessionHelper.getId().then(function (sessionId) {
              globalState.k.s = sessionId;
              globalState.save();
            }).catch(notify.error);
          } else if (globalState.k && globalState.k.s) {
            // there is a sesion id
            kibiSessionHelper.getId().then(function (sessionId) {
              if (globalState.k.s !== sessionId) {
                kibiSessionHelper._copySessionFrom(globalState.k.s).then(function (savedSession) {
                  globalState.k.s = savedSession.id;
                  globalState.save();
                }).catch(notify.error);
              }
            }).catch(notify.error);
          }
          off();
        });
      });

      // below listener on globalState is needed to react when the global time is changed by the user
      // either directly in time widget or by clicking on histogram chart etc
      self.save_with_changes_handler = function (diff) {
        if (diff.indexOf('time') !== -1) {
          self._setTimeFromGlobalState();
        }
      };
      globalState.on('save_with_changes', self.save_with_changes_handler);

      this._updateTimeForAllDashboards();
    };


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
    };

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


    KibiStateHelper.prototype.destroyHandlers = function () {
      globalState.off('save_with_changes', this.save_with_changes_handler);
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
          this._setDashboardProperty(dashboardId, 'q', query);
        } else {
          // store '*' instead the full query to make it more compact as this is very common query
          this._setDashboardProperty(dashboardId, 'q', '*');
        }
      } else {
        this._deleteDashboardProperty(dashboardId, 'q');
      }
      globalState.save();
    };

    KibiStateHelper.prototype.getQueryForDashboardId = function (dashboardId) {
      var q = this._getDashboardProperty(dashboardId, 'q');

      if (q && q !== '*') {
        return q;
      } else if (q && q === '*') {
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
        this._setDashboardProperty(dashboardId, 'f', filters);
      } else {
        // do NOT delete - instead store empty array
        // in other case the previous filters will be restored
        this._setDashboardProperty(dashboardId, 'f', []);
      }
      globalState.save();
    };

    KibiStateHelper.prototype.getFiltersForDashboardId = function (dashboardId) {
      var filters = this._getDashboardProperty(dashboardId, 'f');
      // add also pinned filters which are stored in global state
      if (filters && globalState.filters) {
        return filters.concat(globalState.filters);
      } else if (globalState.filters && globalState.filters.length > 0) {
        return globalState.filters;
      }
      return filters;
    };


    KibiStateHelper.prototype.removeTimeForDashboardId = function (dashboardId, skipGlobalStateSave) {
      this._deleteDashboardProperty(dashboardId, 't');
      if (!skipGlobalStateSave) {
        globalState.save();
      }
    };

    KibiStateHelper.prototype.saveTimeForDashboardId = function (dashboardId, from, to, skipGlobalStateSave) {
      this._setDashboardProperty(dashboardId, 't', {
        f: from,
        t: to
      });
      if (!skipGlobalStateSave) {
        globalState.save();
      }
    };

    KibiStateHelper.prototype.getTimeForDashboardId = function (dashboardId) {
      var t = this._getDashboardProperty(dashboardId, 't');
      if (t) {
        return {
          from: t.f,
          to: t.t
        };
      }
      return null;
    };

    KibiStateHelper.prototype.addFilterToDashboard = function (dashboardId, filter) {
      if (globalState.k.d) {
        var filters = [];
        if (globalState.k.d[dashboardId] && globalState.k.d[dashboardId].f) {
          filters = globalState.k.d[dashboardId].f;
        }

        // here if there is a relational filter it should be replaced
        if (filter && filter.join_set) {
          // replace
          var index = -1;
          _.each(filters, function (f, i) {
            if (f.join_set) {
              index = i;
              return false;
            }
          });
          if (index !== -1) {
            // exists so replace
            filters[index] = filter;
          } else {
            // do not exists so add
            filters.push(filter);
          }
        } else if (filter) {
          // add
          filters.push(filter);
        } else {
          throw new Error('No filter');
        }
        this._setDashboardProperty(dashboardId, 'f', filters);
        globalState.save();
      }
    };

    KibiStateHelper.prototype.removeFilterOfTypeFromDashboard = function (type, dashboardId) {
      if (globalState.k.d) {
        var filters = [];
        if (globalState.k.d[dashboardId] && globalState.k.d[dashboardId].f) {
          filters = globalState.k.d[dashboardId].f;
        }
        filters = _.filter(filters, function (filter) {
          return !filter[type];
        });
        this._setDashboardProperty(dashboardId, 'f', filters);
        globalState.save();
      }
    };

    KibiStateHelper.prototype.removeAllFiltersOfType = function (type) {
      if (globalState.k.d) {
        _.each(globalState.k.d, function (dashboard, dashboardId) {
          globalState.k.d[dashboardId].f = _.filter(globalState.k.d[dashboardId].f, function (filter) {
            return !filter[type];
          });
        });
      }
      globalState.save();
    };


    KibiStateHelper.prototype.removeAllFilters = function () {
      if (globalState.k.d) {
        _.each(globalState.k.d, function (dashboard, dashboardId) {
          globalState.k.d[dashboardId].f = [];
        });
      }
      globalState.save();
    };

    KibiStateHelper.prototype.removeAllQueries = function () {
      if (globalState.k.d) {
        _.each(globalState.k.d, function (dashboard, dashboardId) {
          globalState.k.d[dashboardId].q = '*';
        });
      }
      globalState.save();
    };

    function makeRelationId(relation) {
      const parts = relation.relation.split('/');
      return `${relation.dashboards[0]}/${relation.dashboards[1]}/${parts[1]}/${parts[3]}`;
    }

    KibiStateHelper.prototype.isRelationEnabled = function (relation) {
      if (globalState.k.j instanceof Array) {
        return globalState.k.j.indexOf(makeRelationId(relation)) !== -1;
      }
      return false;
    };

    KibiStateHelper.prototype.getEnabledRelations = function () {
      var enabledRelations = globalState.k.j || [];
      return _.map(enabledRelations, function (rel) {
        var parts = rel.split('/');
        return [parts[0], parts[1]];
      });
    };

    KibiStateHelper.prototype.enableRelation = function (relation) {
      if (!globalState.k.j) {
        globalState.k.j = [];
      }
      const relationId = makeRelationId(relation);
      if (globalState.k.j.indexOf(relationId) === -1) {
        globalState.k.j.push(relationId);
        globalState.save();
      }
    };

    KibiStateHelper.prototype.disableRelation = function (relation) {
      if (!globalState.k.j) {
        globalState.k.j = [];
      }
      const relationId = makeRelationId(relation);
      const index = globalState.k.j.indexOf(relationId);
      if (index !== -1) {
        globalState.k.j.splice(index, 1);
        globalState.save();
      }
    };

    KibiStateHelper.prototype._disableAllRelations = function () {
      if (globalState.k.j) {
        globalState.k.j = [];
        globalState.save();
      }
    };

    KibiStateHelper.prototype._setDashboardProperty = function (dashboardId, prop, value) {
      if (!globalState.k.d[dashboardId]) {
        globalState.k.d[dashboardId] = {};
      }
      globalState.k.d[dashboardId][prop] = value;
    };

    KibiStateHelper.prototype._getDashboardProperty = function (dashboardId, prop) {
      if (!globalState.k.d[dashboardId]) {
        return undefined;
      }
      return globalState.k.d[dashboardId][prop];
    };

    KibiStateHelper.prototype._deleteDashboardProperty = function (dashboardId, prop) {
      if (!globalState.k.d[dashboardId]) {
        return;
      }
      delete globalState.k.d[dashboardId][prop];
      // check if this was the last and only
      // if yes delete the whole dashboard object
      if (Object.keys(globalState.k.d[dashboardId]).length === 0) {
        delete globalState.k.d[dashboardId];
      }
    };


    return new KibiStateHelper();
  };
});
