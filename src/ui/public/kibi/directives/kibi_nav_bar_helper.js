define(function (require) {
  const angular = require('angular');
  const _ = require('lodash');
  const DelayExecutionHelper = require('ui/kibi/helpers/delay_execution_helper');
  const SearchHelper = require('ui/kibi/helpers/search_helper');

  return function KibiNavBarHelperFactory(kibiState, globalState, getAppState, createNotifier, Private, $http, Promise, $rootScope,
                                          savedDashboards, kbnIndex) {
    const notify = createNotifier({
      location: 'kibi_nav_bar directive'
    });

    const dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
    const searchHelper = new SearchHelper(kbnIndex);

    /*
    * Private Methods
    */
    const _fireUpdateAllCounts = function (dashboardIds, forceCountsUpdate = false) {
      if (!dashboardIds) {
        // only the selected dashboard from each group
        dashboardIds = [];
        _.each(this.dashboardGroups, (g, index) => {
          var dashboard = self.dashboardGroups[index].selected;
          if (dashboard && dashboardIds.indexOf(dashboard.id) === -1) {
            dashboardIds.push(dashboard.id);
          }
        });
      }

      return dashboardGroupHelper.getDashboardsMetadata(dashboardIds, forceCountsUpdate).then((metadata) => {
        _.each(this.dashboardGroups, (g) => {
          _.each(g.dashboards, (d) => {
            var foundDashboardMetadata = _.find(metadata, (m) => {
              return m.dashboardId === d.id;
            });
            if (foundDashboardMetadata) {
              d.count = foundDashboardMetadata.count;
              d.isPruned = foundDashboardMetadata.isPruned;
              d.filterIconMessage = dashboardGroupHelper.constructFilterIconMessage(
                foundDashboardMetadata.filters,
                foundDashboardMetadata.queries
              );
            }
          });
        });
      }).catch((err) => {
        notify.warning(err);
      });
    };

    const updateCounts = function (dashboardsIds, reason, forceUpdate = false) {
      if (console) {
        console.log(`Count on tabs will be updated for dashboards ${JSON.stringify(dashboardsIds, null, ' ')} because: [${reason}]`);
      }
      this.delayExecutionHelper.addEventData({
        forceUpdate: forceUpdate,
        ids: dashboardsIds
      });
    };


    // =================
    // Group computation and counts updates
    // =================

    function KibiNavBarHelper() {
      this.appState = null;
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

      var that = this;
      this.delayExecutionHelper = new DelayExecutionHelper(
        (data, alreadyCollectedData) => {
          if (alreadyCollectedData.ids === undefined) {
            alreadyCollectedData.ids = [];
          }
          if (alreadyCollectedData.forceUpdate === undefined) {
            alreadyCollectedData.forceUpdate = false;
          }
          if (data.forceUpdate) {
            alreadyCollectedData.forceUpdate = data.forceUpdate;
          }
          _.each(data.ids, (d) => {
            if (alreadyCollectedData.ids.indexOf(d) === -1) {
              alreadyCollectedData.ids.push(d);
            }
          });
        },
        (data) => {
          var forceUpdate = data.forceUpdate;
          _fireUpdateAllCounts.call(that, data.ids, forceUpdate);
        },
        750,
        DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
      );
    }

    /*
    * Public Methods
    */

    KibiNavBarHelper.prototype.setChrome = function (c) {
      dashboardGroupHelper.setChrome(c);
    };

    KibiNavBarHelper.prototype.updateAllCounts = function (dashboardsIds, reason, forceUpdate = false) {
      if (!dashboardsIds) {
        return savedDashboards.find().then(function (dashboards) {
          return _(dashboards.hits).filter((d) => {
            return !!d.savedSearchId;
          }).map((d) => d.id).value();
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
      if (this.delayExecutionHelper) {
        this.delayExecutionHelper.destroy();
      }
      if (this.removeGetAppStateHandler) {
        this.removeGetAppStateHandler();
      }
      if (this.removeAutorefreshHandler) {
        this.removeAutorefreshHandler();
      }
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
