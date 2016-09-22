define(function (require) {

  const _ = require('lodash');
  const angular = require('angular');
  const chrome = require('ui/chrome');

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules')
  .get('kibana/kibi_sequential_join_vis', ['kibana'])
  .controller('KibiSequentialJoinVisController', function (getAppState, kibiState, $scope, $rootScope, Private, $http, createNotifier,
                                                           globalState, Promise) {
    const urlHelper = Private(require('ui/kibi/helpers/url_helper'));

    const notify = createNotifier({
      location: 'Kibi Relational filter'
    });
    const appState = getAppState();

    const kibiSequentialJoinVisHelper = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));
    const currentDashboardId = kibiState._getCurrentDashboardId();

    if (!kibiState.isSirenJoinPluginInstalled()) {
      notify.error('This version of Kibi Relational filter requires the SIREn Join plugin. Please install it and restart Kibi.');
    }

    // Update the counts on each button of the related filter
    var _updateCounts = function (buttons, dashboardId) {
      if (urlHelper.onVisualizeTab() || !buttons || !buttons.length) {
        return Promise.resolve([]);
      }

      return Promise.all(_.map(buttons, (button) => {
        return Promise.all([
          kibiState.timeBasedIndices(button.targetIndexPatternId, button.redirectToDashboard),
          kibiSequentialJoinVisHelper.getJoinSequenceFilter(dashboardId, button)
        ])
        .then(([ indices, joinSeqFilter ]) => {
          button.joinSeqFilter = joinSeqFilter;
          return kibiSequentialJoinVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter)
          .then((query) => {
            return { query, button, indices };
          });
        });
      })).then((results) => {
        let query = '';
        _.each(results, function (result) {
          query += `{"index":${angular.toJson(result.indices)}}\n${angular.toJson(result.query)}\n`;
        });

        // ?getCountsOnButton has no meanning it is just usefull to filter when inspecting requests
        return $http.post(chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnButton', query)
        .then((response) => {
          const data = response.data;
          _.each(data.responses, function (hit, i) {
            if (hit.error) {
              notify.error(JSON.stringify(hit.error, null, ' '));
              return;
            }
            results[i].button.targetCount = hit.hits.total;
            results[i].button.warning = '';
            if (hit.coordinate_search) {
              let isPruned = false;
              const actions = hit.coordinate_search.actions;
              for (let j = 0; j < actions.length; j++) {
                if (actions[j].is_pruned) {
                  isPruned = true;
                  break;
                }
              }
              if (isPruned) {
                results[i].button.warning = 'Results from this filter are pruned';
              }
            }
          });
          return _.map(results, (result) => result.button);
        });
      }).catch(notify.error);
    };

    var _constructButtons = function () {
      $scope.vis.error = '';
      if (!urlHelper.onVisualizeTab()) {
        return kibiState._getDashboardAndSavedSearchMetas([ currentDashboardId ]).then(([ { savedDash, savedSearchMeta } ]) => {
          const index = savedSearchMeta.index;
          const buttons = kibiSequentialJoinVisHelper.constructButtonsArray($scope.vis.params.buttons, index);
          // retain the buttons order
          for (let i = 0; i < buttons.length; i++) {
            buttons[i].btnIndex = i;
          }
          if (!buttons.length) {
            const msg = `The relational filter visualization "${$scope.vis.title}" is not configured for this dashboard. ` +
                `No button has a source index set to ${index}.`;
            $scope.vis.error = msg;
            notify.error(msg);
          }
          return buttons;
        }).catch(notify.error);
      } else {
        $scope.buttons = kibiSequentialJoinVisHelper.constructButtonsArray($scope.vis.params.buttons);
      }
    };

    /*
     * Update counts in reaction to events
     */

    var updateButtons = function (reason) {
      if (urlHelper.onVisualizeTab()) {
        return;
      }

      if (console) {
        console.log(`Updating counts on the relational buttons because: ${reason}`);
      }
      const self = this;
      let promise;
      if (!$scope.buttons || !$scope.buttons.length) {
        promise = _constructButtons.call(self);
      } else {
        promise = Promise.resolve($scope.buttons);
      }
      promise
      .then((buttons) => _updateCounts.call(self, buttons, currentDashboardId))
      .then((buttons) => {
        // http://stackoverflow.com/questions/20481327/data-is-not-getting-updated-in-the-view-after-promise-is-resolved
        // assign data to $scope.buttons once the promises are done
        $scope.buttons = new Array(buttons.length);
        const getSourceCount = function (currentDashboardId) {
          const virtualButton = {
            sourceField: this.targetField,
            sourceIndexPatternId: this.targetIndexPatternId,
            targetField: this.sourceField,
            targetIndexPatternId: this.sourceIndexPatternId,
            redirectToDashboard: currentDashboardId
          };
          return _updateCounts.call(self, [ virtualButton ], this.redirectToDashboard)
          .then(() => virtualButton.targetCount)
          .catch(notify.error);
        };
        for (let i = 0; i < buttons.length; i++) {
          buttons[i].getSourceCount = getSourceCount;
          // Returns the count of documents involved in the join
          $scope.buttons[buttons[i].btnIndex] = buttons[i];
        }
      })
      .catch(notify.error);
    };

    var kibiDashboardChangedOff = $rootScope.$on('kibi:dashboard:changed', updateButtons.bind(this, 'kibi:dashboard:changed'));

    $scope.$listen(kibiState, 'save_with_changes', function (diff) {
      if (diff.indexOf(kibiState._properties.enabled_relations) !== -1 ||
          diff.indexOf(kibiState._properties.enabled_relational_panel) !== -1) {
        updateButtons.call(this, 'Relations changes');
      }
    });

    $scope.$listen(appState, 'save_with_changes', function (diff) {
      if (diff.indexOf('query') === -1 && diff.indexOf('filters') === -1) {
        return;
      }
      updateButtons.call(this, 'AppState changes');
    });

    $scope.$listen(globalState, 'save_with_changes', function (diff) {
      const currentDashboard = kibiState._getCurrentDashboardId();
      if (!currentDashboard) {
        return;
      }

      if (diff.indexOf('filters') !== -1) {
        // the pinned filters changed, update counts on all selected dashboards
        updateButtons.call(this, 'GlobalState pinned filters change');
      } else if (diff.indexOf('time') !== -1) {
        updateButtons.call(this, 'GlobalState time changed');
      } else if (diff.indexOf('refreshInterval') !== -1) {
        // force the count update to refresh all tabs count
        updateButtons.call(this, 'GlobalState refreshInterval changed');
      }
    });

    // when autoupdate is on we detect the refresh here
    const removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', (event) => {
      const currentDashboard = kibiState._getCurrentDashboardId();
      if (!currentDashboard) {
        return;
      }

      updateButtons('courier:searchRefresh');
    });

    $scope.$on('$destroy', function () {
      kibiDashboardChangedOff();
      kibiSequentialJoinVisHelper.destroy();
      removeAutorefreshHandler();
    });

    $scope.$watch('vis.params.buttons', function () {
      _constructButtons();
    }, true);

    // init
    updateButtons('init');
  });
});
