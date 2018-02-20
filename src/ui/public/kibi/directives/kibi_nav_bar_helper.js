import angular from 'angular';
import _ from 'lodash';
import { DelayExecutionHelperFactory } from 'ui/kibi/helpers/delay_execution_helper';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

export function KibiNavBarHelperFactory(dashboardGroups, kibiState, globalState, getAppState, createNotifier, Private, $rootScope,
  savedDashboards, timefilter) {

  const notify = createNotifier({
    location: 'Kibi Navbar helper'
  });

  const DelayExecutionHelper = Private(DelayExecutionHelperFactory);

  const NO_METADATA_UPDATE = Symbol.for('no metadata to update on any dashboard');

  /*
  * Private Methods
  */
  const updateCounts = function (dashboardsIds, reason, forceUpdate = false) {
    if (!dashboardsIds.length) {
      return;
    }
    if (console.debug) {  // eslint-disable-line no-console
      const msg = `KibiNavBar requested count update for following dashboards
        ${JSON.stringify(dashboardsIds, null, ' ')} because: [${reason}]`;
      console.debug(msg); // eslint-disable-line no-console
    }
    return this.delayExecutionHelper.addEventData({
      forceUpdate: forceUpdate,
      ids: dashboardsIds
    });
  };


  // =================
  // Group computation and counts updates
  // =================

  function KibiNavBarHelper() {
    const updateCountsOnAppStateChange = function (diff) {
      if (diff.indexOf('query') === -1 && diff.indexOf('filters') === -1) {
        return;
      }
      // when appState changed get connected and selected dashboards
      const currentDashboard = kibiState.getDashboardOnView();
      if (!currentDashboard) {
        return;
      }
      this.updateAllCounts([currentDashboard.id], 'AppState change ' + angular.toJson(diff));
    };

    const updateCountsOnGlobalStateChange = function (diff) {
      const currentDashboard = kibiState.getDashboardOnView();
      if (!currentDashboard) {
        return;
      }

      if (diff.indexOf('filters') !== -1) {
        // the pinned filters changed, update counts on all selected dashboards
        this.updateAllCounts(null, 'GlobalState pinned filters change');
      } else if (diff.indexOf('time') !== -1) {
        this.updateAllCounts([currentDashboard.id], 'GlobalState time changed');
      } else if (diff.indexOf('refreshInterval') !== -1) {
        // force the count update to refresh all tabs count
        this.updateAllCounts(null, 'GlobalState refreshInterval changed', true);
      }
    };
    const updateCountsOnKibiStateReset = function (dashboardsIds) {
      this.updateAllCounts(dashboardsIds, 'KibiState reset');
    };

    const updateCountsOnKibiStateTime = function (dashboardId, newTime, oldTime) {
      this.updateAllCounts([dashboardId], `KibiState time changed on dashboard ${dashboardId}`);
    };

    const updateCountsOnKibiStateChange = function (diff) {
      // when kibiState changes get connected and selected dashboards
      const currentDashboard = kibiState.getDashboardOnView();
      if (!currentDashboard) {
        return;
      }
      if (diff.indexOf(kibiState._properties.groups) !== -1 || diff.indexOf(kibiState._properties.dashboards) !== -1) {
        this.updateAllCounts([currentDashboard.id], `KibiState change ${JSON.stringify(diff, null, ' ')}`);
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
    $rootScope.$listen(kibiState, 'time', updateCountsOnKibiStateTime.bind(this));

    // everywhere use this event !!! to be consistent
    // make a comment that it was required because not all components can listen to
    // esResponse
    $rootScope.$on('courier:searchRefresh', (event) => {
      if ((timefilter.refreshInterval.display !== 'Off')
          && (timefilter.refreshInterval.pause === false)) {
        const currentDashboard = kibiState.getDashboardOnView();
        if (!currentDashboard) {
          return;
        }
        this.updateAllCounts(null, 'courier:searchRefresh event', true);
      }
    });

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
          const filteredDashboardsIds = dashboardGroups.getVisibleDashboardIds(data.ids);

          if (!filteredDashboardsIds.length) {
            return Promise.resolve(NO_METADATA_UPDATE);
          }

          return dashboardGroups.updateMetadataOfDashboardIds(filteredDashboardsIds, forceUpdate)
          .catch(notify.warning);
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

  KibiNavBarHelper.prototype.cancelExecutionInProgress = function () {
    if (this.delayExecutionHelper) {
      this.delayExecutionHelper.cancel();
    }
  };

  return new KibiNavBarHelper();
};
