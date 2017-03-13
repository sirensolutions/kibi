define(function (require) {

  const _ = require('lodash');
  const angular = require('angular');
  const chrome = require('ui/chrome');
  const moment = require('moment');
  const DelayExecutionHelper = require('ui/kibi/helpers/delay_execution_helper');
  const SearchHelper = require('ui/kibi/helpers/search_helper');
  const isJoinPruned = require('ui/kibi/helpers/is_join_pruned');

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules')
  .get('kibana/kibi_sequential_join_vis', ['kibana'])
  .controller('KibiSequentialJoinVisController', function (getAppState, kibiState, $scope, $rootScope, Private, $http, createNotifier,
                                                           globalState, Promise, kbnIndex) {
    const searchHelper = new SearchHelper(kbnIndex);
    const onVisualizeTab = chrome.onVisualizeTab();

    const notify = createNotifier({
      location: 'Kibi Relational filter'
    });
    const appState = getAppState();

    const relationsHelper = Private(require('ui/kibi/helpers/relations_helper'));
    const kibiSequentialJoinVisHelper = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));
    const currentDashboardId = kibiState._getCurrentDashboardId();
    const queryFilter = Private(require('ui/filter_bar/query_filter'));

    if (!kibiState.isSirenJoinPluginInstalled()) {
      notify.error('This version of Kibi Relational filter requires the SIREn Join plugin. Please install it and restart Kibi.');
    }

    // Update the counts on each button of the related filter
    var _fireUpdateCounts = function (buttons, dashboardId) {
      if ($scope.multiSearchData) {
        $scope.multiSearchData.clear();
      }

      return Promise.all(_.map(buttons, (button) => {
        return Promise.all([
          kibiState.timeBasedIndices(button.targetIndexPatternId, button.targetDashboardId),
          kibiSequentialJoinVisHelper.getJoinSequenceFilter(dashboardId, button)
        ])
        .then(([ indices, joinSeqFilter ]) => {
          button.joinSeqFilter = joinSeqFilter;
          return kibiSequentialJoinVisHelper.buildCountQuery(button.targetDashboardId, joinSeqFilter)
          .then((query) => {
            return { query, button, indices };
          });
        })
        .catch((error) => {
          // If computing the indices failed because of an authorization error
          // set indices to an empty array and mark the button as forbidden.
          if (error.status !== 403) {
            throw error;
          }
          button.forbidden = true;
          return kibiSequentialJoinVisHelper.buildCountQuery(button.targetDashboardId)
          .then((query) => {
            return { query, button, indices: [] };
          });
        });
      })).then((results) => {
        const query = _.map(results, result => {
          return searchHelper.optimize(result.indices, result.query);
        }).join('');
        const duration = moment();

        // ?getCountsOnButton has no meaning it is just useful to filter when inspecting requests
        return $http.post(chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnButton', query)
        .then((response) => {
          if ($scope.multiSearchData) {
            $scope.multiSearchData.setDuration(duration.diff() * -1);
          }
          const data = response.data;
          _.each(data.responses, function (hit, i) {
            const stats = {
              index: results[i].button.targetIndexPatternId,
              type: results[i].button.targetIndexPatternType,
              meta: {
                label: results[i].button.label
              },
              response: hit,
              query: results[i].query
            };

            if (results[i].button.forbidden) {
              results[i].button.warning = 'Access to an index referred by this button is forbidden.';
              return;
            }
            if (hit.error) {
              const error = JSON.stringify(hit.error, null, ' ');
              if (error.match(/ElasticsearchSecurityException/)) {
                results[i].button.warning = 'Access to an index referred by this button is forbidden.';
              }
              notify.error(error);
              if ($scope.multiSearchData) {
                $scope.multiSearchData.add(stats);
              }
              return;
            }
            results[i].button.targetCount = hit.hits.total;
            results[i].button.warning = '';
            if (isJoinPruned(hit)) {
              results[i].button.warning = 'Results from this filter are pruned';
              stats.pruned = true;
            }
            if ($scope.multiSearchData) {
              $scope.multiSearchData.add(stats);
            }
          });
          return _.map(results, (result) => result.button);
        });
      }).catch(notify.error);
    };

    const delayExecutionHelper = new DelayExecutionHelper(
      (data, alreadyCollectedData) => {
        alreadyCollectedData.dashboardId = data.dashboardId;
        alreadyCollectedData.buttons = data.buttons;
      },
      (data) => {
        _fireUpdateCounts(data.buttons, data.dashboardId);
      },
      750,
      DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
    );

    const _collectUpdateCountsRequest = function (buttons, dashboardId) {
      if (onVisualizeTab || !buttons || !buttons.length) {
        return Promise.resolve([]);
      }
      delayExecutionHelper.addEventData({
        buttons: buttons,
        dashboardId: dashboardId
      });
      return Promise.resolve(buttons);
    };

    const _constructButtons = function () {
      const buttonsDefs = _.filter($scope.vis.params.buttons, btn => relationsHelper.validateIndicesRelationFromId(btn.indexRelationId));

      $scope.vis.error = '';

      if (buttonsDefs.length !== $scope.vis.params.buttons.length) {
        $scope.vis.error = 'Invalid configuration of the Kibi relational filter visualization';
        if (!onVisualizeTab) {
          return Promise.reject($scope.vis.error);
        }
      }

      if (!onVisualizeTab) {
        return kibiState._getDashboardAndSavedSearchMetas([currentDashboardId]).then(([ { savedDash, savedSearchMeta } ]) => {
          const currentDashboardIndex = savedSearchMeta.index;
          const currentDashboardId = savedDash.id;
          const buttons = kibiSequentialJoinVisHelper.constructButtonsArray(buttonsDefs, currentDashboardIndex, currentDashboardId);
          // retain the buttons order
          for (let i = 0; i < buttons.length; i++) {
            buttons[i].btnIndex = i;
          }
          if (!buttons.length) {
            $scope.vis.error =
              `The relational filter visualization "${$scope.vis.title}" is not configured for this dashboard. ` +
              `No button has a source index matching the current dashboard index: ${currentDashboardIndex}.`;
          }
          return buttons;
        }).catch(notify.error);
      } else {
        $scope.buttons = kibiSequentialJoinVisHelper.constructButtonsArray(buttonsDefs);
      }
    };

    /*
     * Update counts in reaction to events
     */

    var updateButtons = function (reason) {
      if (onVisualizeTab) {
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
      .then((buttons) => _collectUpdateCountsRequest.call(self, buttons, currentDashboardId))
      .then((buttons) => {
        // http://stackoverflow.com/questions/20481327/data-is-not-getting-updated-in-the-view-after-promise-is-resolved
        // assign data to $scope.buttons once the promises are done
        $scope.buttons = new Array(buttons.length);
        const getSourceCount = function (currentDashboardId) {
          const virtualButton = {
            sourceField: this.targetField,
            sourceIndexPatternId: this.targetIndexPatternId,
            sourceIndexPatternType: this.targetIndexPatternType,
            targetField: this.sourceField,
            targetIndexPatternId: this.sourceIndexPatternId,
            targetIndexPatternType: this.sourceIndexPatternType,
            targetDashboardId: currentDashboardId
          };
          // NOTE:
          // here we do not want to delay the count update
          // this is why for now we call directly _fireUpdateCounts
          // instead of _collectUpdateCountsRequest
          // This could be done in future to further reduce the number of calls but
          // as it requires greater refactoring I postponed it for now
          return _fireUpdateCounts.call(self, [ virtualButton ], this.targetDashboardId)
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

    $scope.$listen(queryFilter, 'update', function () {
      updateButtons.call(this, 'filters change');
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
      delayExecutionHelper.cancel();
      kibiDashboardChangedOff();
      removeAutorefreshHandler();
    });

    $scope.$watch('vis.params.buttons', function () {
      _constructButtons();
    }, true);

    // init
    updateButtons('init');
  });
});
