define(function (require) {
  const angular = require('angular');
  const _ = require('lodash');

  return function KibiNavBarHelperFactory(kibiState, globalState, getAppState, createNotifier, Private, $http, Promise, $rootScope,
                                          savedDashboards) {
    const notify = createNotifier({
      name: 'kibi_nav_bar directive'
    });

    const dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));

    function KibiNavBarHelper() {
      this.appState = null;
      this.chrome = null;
      this.dashboardGroups = [];
      this.init = _.once(() => {
        return this.computeDashboardsGroups('init')
        .then(() => this.updateAllCounts(null, 'init'));
      });

      const addAllConnected = function (dashboardId) {
        const connected = kibiState._getDashboardsIdInConnectedComponent(dashboardId, kibiState.getEnabledRelations());
        return connected.length > 0 ? connected : [dashboardId];
      };

      const updateCountsOnAppStateChange = function (diff) {
        if (diff.indexOf('query') === -1 && diff.indexOf('filters') === -1) {
          return;
        }
        // when appState changed get connected and selected dashboards
        const currentDashboard = kibiState._getCurrentDashboardId();
        if (!currentDashboard) {
          return;
        }
        const dashboardsIds = addAllConnected.call(this, currentDashboard);
        this.updateAllCounts(dashboardsIds, 'AppState change ' + angular.toJson(diff));
      };

      const updateCountsOnGlobalStateChange = function (diff) {
        const currentDashboard = kibiState._getCurrentDashboardId();
        if (!currentDashboard) {
          return;
        }

        if (diff.indexOf('filters') !== -1) {
          // the pinned filters changed, update counts on all selected dashboards
          this.updateAllCounts(null, 'GlobalState pinned filters change');
        } else if (diff.indexOf('time') !== -1) {
          const dashboardsIds = addAllConnected.call(this, currentDashboard);
          this.updateAllCounts(dashboardsIds, 'GlobalState time changed');
        } else if (diff.indexOf('refreshInterval') !== -1) {
          // force the count update to refresh all tabs count
          this.updateAllCounts(null, 'GlobalState refreshInterval changed', true);
        }
      };

      const updateCountsOnKibiStateRelation = function (ids) {
        const dashboardsIds = _(ids).map((dashboardId) => addAllConnected.call(this, dashboardId)).flatten().uniq().value();
        this.updateAllCounts(dashboardsIds, 'KibiState enabled relations changed');
      };

      const updateCountsOnKibiStateReset = function (dashboardsIds) {
        this.updateAllCounts(dashboardsIds, 'KibiState reset');
      };

      const updateCountsOnKibiStateTime = function (dashboardId, newTime, oldTime) {
        const dashboardsIds = addAllConnected.call(this, dashboardId);
        this.updateAllCounts(dashboardsIds, `KibiState time changed on dashboard ${dashboardId}`);
      };

      const updateCountsOnKibiStateChange = function (diff) {
        // when kibiState changes get connected and selected dashboards
        const currentDashboard = kibiState._getCurrentDashboardId();
        if (!currentDashboard) {
          return;
        }
        if (diff.indexOf(kibiState._properties.groups) !== -1 || diff.indexOf(kibiState._properties.enabled_relational_panel) !== -1) {
          const dashboardsIds = addAllConnected.call(this, currentDashboard);
          this.updateAllCounts(dashboardsIds, `KibiState change ${JSON.stringify(diff, null, ' ')}`);
        }
      };

      $rootScope.$listen(globalState, 'save_with_changes', (diff) => updateCountsOnGlobalStateChange.call(this, diff));
      this.removeGetAppStateHandler = $rootScope.$watch(getAppState, (as) => {
        if (as) {
          this.appState = as;
          $rootScope.$listen(this.appState, 'save_with_changes', (diff) => updateCountsOnAppStateChange.call(this, diff));
        }
      });
      $rootScope.$listen(kibiState, 'save_with_changes', (diff) => updateCountsOnKibiStateChange.call(this, diff));
      $rootScope.$listen(kibiState, 'reset', (dashboardsIds) => updateCountsOnKibiStateReset.call(this, dashboardsIds));
      $rootScope.$listen(kibiState, 'relation', (dashboardsIds) => updateCountsOnKibiStateRelation.call(this, dashboardsIds));
      $rootScope.$listen(kibiState, 'time', updateCountsOnKibiStateTime.bind(this));

      // everywhere use this event !!! to be consistent
      // make a comment that it was required because not all components can listen to
      // esResponse
      this.removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', (event) => {
        const currentDashboard = kibiState._getCurrentDashboardId();
        if (!currentDashboard) {
          return;
        }

        // refresh all tabs count
        this.updateAllCounts(null, 'courier:searchRefresh event', true);
      });
    }

    /*
    * Private Methods
    */

    const addFiltersIconMessages = function (tab) {
      return kibiState.getState(tab.selected.id).then(({ queries, filters }) => {
        if (queries || filters) {
          if (queries.length > 1 && filters.length !== 0) {
            tab.selected.filterIconMessage = 'This dashboard has a query and ' + filters.length + ' filter(s) set.';
          } else if (queries.length > 1) {
            tab.selected.filterIconMessage = 'This dashboard has a query set.';
          } else if (filters.length !== 0) {
            tab.selected.filterIconMessage = 'This dashboard has ' + filters.length + ' filter(s) set.';
          } else {
            tab.selected.filterIconMessage = null;
          }
        }
      });
    };

    let lastFiredMultiCountQuery;
    const _fireUpdateAllCounts = function (groupIndexesToUpdate, reason, forceUpdate = false) {
      const self = this;

      const countForDashboard = function (dashboardGroups, index) {
        const selectedDashboard = dashboardGroupHelper.getCountQueryForSelectedDashboard(dashboardGroups, index);
        const timeBasedSelectedDashboard = selectedDashboard.then(({ indexPatternId, dashboardId }) => {
          if (!indexPatternId || !dashboardId) {
            return;
          }
          return kibiState.timeBasedIndices(indexPatternId, dashboardId);
        });
        return Promise.all([ selectedDashboard, timeBasedSelectedDashboard ])
        .then(([ { groupIndex, query }, indices ]) => {
          return { groupIndex, query, indices };
        });
      };

      let promises;
      if (groupIndexesToUpdate && groupIndexesToUpdate.constructor === Array && groupIndexesToUpdate.length > 0) {
        promises = _.map(groupIndexesToUpdate, (index) => countForDashboard(self.dashboardGroups, index));
      } else {
        promises = _.map(self.dashboardGroups, (g, index) => countForDashboard(self.dashboardGroups, index));
      }

      return Promise.all(promises).then((results) => {
        // if there is resolved promise with no query property
        // it means that this group has no index attached and should be skipped when updating the group counts
        _.remove(results, result => !result.query || !result.indices);

        const query = _.map(results, result => `{"index":${angular.toJson(result.indices)}}\n${angular.toJson(result.query)}\n`).join('');

        if (query && (forceUpdate || lastFiredMultiCountQuery !== query)) {
          lastFiredMultiCountQuery = query;

          //Note: ?getCountsOnTabs has no meaning, it is just useful to filter when inspecting requests
          return $http.post(self.chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnTabs', query).then((response) => {
            const filtersIconMessagesPromises = [];
            _.each(response.data.responses, function (hit, i) {
              // get the corresponding groupIndex from results
              const tab = self.dashboardGroups[results[i].groupIndex];
              try {
                if (!_.contains(Object.keys(hit), 'error')) {
                  tab.count = hit.hits.total;
                  tab.selected.filterIconMessage = null;
                  filtersIconMessagesPromises.push(addFiltersIconMessages.call(this, tab));
                } else if (_.contains(Object.keys(hit), 'error') && _.contains(hit.error, 'ElasticsearchSecurityException')) {
                  tab.count = 'Unauthorized';
                } else {
                  tab.count = 'Error';
                }
              } catch (e) {
                notify.warning('An error occurred while getting counts for tab ' + tab.title + ': ' + e);
              }
            });
            return Promise.all(filtersIconMessagesPromises).then(() => self.dashboardGroups);
          })
          .catch((err) => {
            notify.error(`Couldn't get counts for tabs: ${JSON.stringify(err, null, ' ')}`);
          });
        }
      }).catch(notify.warning);
    };

    // =================
    // Group computation and counts updates
    // =================

    const getGroupIndexes = function (dashboardsIds) {
      const groupIndexes = [];

      _.each(dashboardsIds, (dashId) => {
        const groupIndex = _.findIndex(this.dashboardGroups, (group) => group.selected.id === dashId);
        if (groupIndex !== -1 && groupIndexes.indexOf(groupIndex) === -1) {
          groupIndexes.push(groupIndex);
        }
      });
      return groupIndexes;
    };

    /*
    * Public Methods
    */

    KibiNavBarHelper.prototype.setChrome = function (c) {
      this.chrome = c;
    };

    // debounce count queries
    //let lastEventTimer;
    const updateCounts = function (dashboardsIds, reason, forceUpdate = false) {
      if (console) {
        console.log(`Count on tabs will be updated for dashboards ${JSON.stringify(dashboardsIds, null, ' ')} because: [${reason}]`);
      }
      // TODO: https://github.com/sirensolutions/kibi-internal/issues/1273
      //$timeout.cancel(lastEventTimer);
      //lastEventTimer = $timeout(() => _fireUpdateAllCounts.call(this, getGroupIndexes.call(this, dashboardsIds), reason), 750);
      //return lastEventTimer;
      return _fireUpdateAllCounts.call(this, getGroupIndexes.call(this, dashboardsIds), reason, forceUpdate);
    };

    KibiNavBarHelper.prototype.updateAllCounts = function (dashboardsIds, reason, forceUpdate = false) {
      if (!dashboardsIds) {
        return savedDashboards.find().then(function (dashboards) {
          return _(dashboards.hits).filter((d) => !!d.savedSearchId).map((d) => d.id).value();
        })
        .then((ids) => updateCounts.call(this, ids, reason, forceUpdate))
        .catch(notify.error);
      } else {
        return updateCounts.call(this, dashboardsIds, reason, forceUpdate);
      }
    };

    KibiNavBarHelper.prototype.computeDashboardsGroups = function (reason) {
      if (console) {
        console.log('Dashboard Groups will be recomputed because: [' + reason + ']');
      }
      return dashboardGroupHelper.computeGroups()
      .then((groups) => {
        dashboardGroupHelper.copy(groups, this.dashboardGroups);
        return this.dashboardGroups;
      });
    };

    KibiNavBarHelper.prototype.destroy = function () {
      if (this.removeGetAppStateHandler) {
        this.removeGetAppStateHandler();
      }
      if (this.removeAutorefreshHandler) {
        this.removeAutorefreshHandler();
      }
      //$timeout.cancel(lastEventTimer);
      this.appState = null;
    };

    KibiNavBarHelper.prototype.getDashboardGroups = function () {
      return this.dashboardGroups;
    };

    KibiNavBarHelper.prototype._setDashboardGroups = function (groups) {
      this.dashboardGroups = groups;
    };

    return new KibiNavBarHelper();
  };
});
