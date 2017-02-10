import angular from 'angular';
import _ from 'lodash';
import DelayExecutionHelper from 'ui/kibi/helpers/delay_execution_helper';
import SearchHelper from 'ui/kibi/helpers/search_helper';
import chrome from 'ui/chrome';
import DashboardGroupHelperProvider from 'ui/kibi/helpers/dashboard_group_helper';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

export default function KibiNavBarHelperFactory(kibiState, globalState, getAppState, createNotifier, Private, $rootScope, savedDashboards,
  kbnIndex) {
  const notify = createNotifier({
    location: 'Kibi Navbar helper'
  });

  const dashboardGroupHelper = Private(DashboardGroupHelperProvider);

  /*
  * Private Methods
  */
  const _fireUpdateAllCounts = function (dashboardIds, forceCountsUpdate = false) {
    const filteredDashboardsIds = new Set();
    if (!dashboardIds) {
      // only the selected/visible dashboard from each group
      _.each(this.dashboardGroups, (g) => {
        if (g.selected) {
          filteredDashboardsIds.add(g.selected.id);
        }
      });
    } else {
      // filter the given dashboardIds
      // to use only the selected/visible dashboard from each group
      _.each(this.dashboardGroups, (g) => {
        if (g.selected && _.contains(dashboardIds, g.selected.id)) {
          filteredDashboardsIds.add(g.selected.id);
        }
      });
    }

    if (!filteredDashboardsIds.size) {
      return;
    }
    if (console) {
      const msg = 'KibiNavBar will update the counts for following dashboards ' + JSON.stringify(filteredDashboardsIds, null, ' ');
      console.log(msg); // eslint-disable-line no-console
    }

    return dashboardGroupHelper.getDashboardsMetadata(filteredDashboardsIds, forceCountsUpdate)
    .then((metadata) => {
      _.each(this.dashboardGroups, (g) => {
        _.each(g.dashboards, (d) => {
          const foundDashboardMetadata = _.find(metadata, 'dashboardId', d.id);
          if (foundDashboardMetadata) {
            d.count = foundDashboardMetadata.count;
            d.isPruned = foundDashboardMetadata.isPruned;
            d.filterIconMessage = dashboardGroupHelper.constructFilterIconMessage(
              foundDashboardMetadata.filters,
              foundDashboardMetadata.queries
            );
          } else if (filteredDashboardsIds.has(d.id)) {
            // count for that dashboard was requested but is not in the metadata, likely because it doesn't have a savedSearchId
            delete d.count;
            delete d.isPruned;
            delete d.filterIconMessage;
          }
        });
      });
    })
    .catch(notify.warning);
  };

  const updateCounts = function (dashboardsIds, reason, forceUpdate = false) {
    if (!dashboardsIds.length) {
      return;
    }
    if (console) {
      const msg = `KibiNavBar requested count update for following dashboards
        ${JSON.stringify(dashboardsIds, null, ' ')} because: [${reason}]`;
      console.log(msg); // eslint-disable-line no-console
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
    this.chrome = chrome;
    this.dashboardGroups = [];
    this.init = _.once(() => {
      return this.computeDashboardsGroups('init')
      .then(() => this.updateAllCounts(null, 'init'));
    });

    const updateCountsOnAppStateChange = function (diff) {
      if (diff.indexOf('query') === -1 && diff.indexOf('filters') === -1) {
        return;
      }
      // when appState changed get connected and selected dashboards
      const currentDashboard = kibiState._getCurrentDashboardId();
      if (!currentDashboard) {
        return;
      }
      const dashboardsIds = kibiState.addAllConnected(currentDashboard);
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
        const dashboardsIds = kibiState.addAllConnected(currentDashboard);
        this.updateAllCounts(dashboardsIds, 'GlobalState time changed');
      } else if (diff.indexOf('refreshInterval') !== -1) {
        // force the count update to refresh all tabs count
        this.updateAllCounts(null, 'GlobalState refreshInterval changed', true);
      }
    };

    const updateCountsOnKibiStateRelation = function (ids) {
      const dashboardsIds = _(ids).map((dashboardId) => kibiState.addAllConnected(dashboardId)).flatten().uniq().value();
      this.updateAllCounts(dashboardsIds, 'KibiState enabled relations changed');
    };

    const updateCountsOnKibiStateReset = function (dashboardsIds) {
      this.updateAllCounts(dashboardsIds, 'KibiState reset');
    };

    const updateCountsOnKibiStateTime = function (dashboardId, newTime, oldTime) {
      const dashboardsIds = kibiState.addAllConnected(dashboardId);
      this.updateAllCounts(dashboardsIds, `KibiState time changed on dashboard ${dashboardId}`);
    };

    const updateCountsOnKibiStateChange = function (diff) {
      // when kibiState changes get connected and selected dashboards
      const currentDashboard = kibiState._getCurrentDashboardId();
      if (!currentDashboard) {
        return;
      }
      if (diff.indexOf(kibiState._properties.groups) !== -1 || diff.indexOf(kibiState._properties.enabled_relational_panel) !== -1) {
        const dashboardsIds = kibiState.addAllConnected(currentDashboard);
        this.updateAllCounts(dashboardsIds, `KibiState change ${JSON.stringify(diff, null, ' ')}`);
      }
    };

    $rootScope.$listen(globalState, 'save_with_changes', (diff) => updateCountsOnGlobalStateChange.call(this, diff));
    $rootScope.$watch(getAppState, (as) => {
      if (as) {
        $rootScope.$listen(as, 'save_with_changes', (diff) => updateCountsOnAppStateChange.call(this, diff));
      }
    });
    $rootScope.$listen(kibiState, 'save_with_changes', (diff) => updateCountsOnKibiStateChange.call(this, diff));
    $rootScope.$listen(kibiState, 'reset', (dashboardsIds) => updateCountsOnKibiStateReset.call(this, dashboardsIds));
    $rootScope.$listen(kibiState, 'relation', (dashboardsIds) => updateCountsOnKibiStateRelation.call(this, dashboardsIds));
    $rootScope.$listen(kibiState, 'time', updateCountsOnKibiStateTime.bind(this));

    // everywhere use this event !!! to be consistent
    // make a comment that it was required because not all components can listen to
    // esResponse
    $rootScope.$on('courier:searchRefresh', (event) => {
      const currentDashboard = kibiState._getCurrentDashboardId();
      if (!currentDashboard) {
        return;
      }
      this.updateAllCounts(null, 'courier:searchRefresh event', true);
    });

    const self = this;
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
        if (onDashboardPage()) {
          const forceUpdate = data.forceUpdate;
          _fireUpdateAllCounts.call(self, data.ids, forceUpdate);
        }
      },
      750,
      DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
    );
  }

  /*
  * Public Methods
  */

  KibiNavBarHelper.prototype.updateAllCounts = function (dashboardsIds, reason, forceUpdate = false) {
    if (!dashboardsIds) {
      return savedDashboards.find()
      .then(function (dashboards) {
        return _(dashboards.hits).filter('savedSearchId').map('id').value();
      })
      .then((ids) => updateCounts.call(this, ids, reason, forceUpdate))
      .catch(notify.error);
    } else {
      return updateCounts.call(this, dashboardsIds, reason, forceUpdate);
    }
  };

  KibiNavBarHelper.prototype.computeDashboardsGroups = function (reason) {
    if (console) {
      console.log('Dashboard Groups will be recomputed because: [' + reason + ']'); // eslint-disable-line no-console
    }
    return dashboardGroupHelper.computeGroups()
    .then((groups) => {
      dashboardGroupHelper.copy(groups, this.dashboardGroups);
      return this.dashboardGroups;
    });
  };

  KibiNavBarHelper.prototype.cancelExecutionInProgress = function () {
    if (this.delayExecutionHelper) {
      this.delayExecutionHelper.cancel();
    }
  };

  KibiNavBarHelper.prototype.getDashboardGroups = function () {
    return this.dashboardGroups;
  };

  KibiNavBarHelper.prototype._setDashboardGroups = function (groups) {
    this.dashboardGroups = groups;
  };

  return new KibiNavBarHelper();
};
