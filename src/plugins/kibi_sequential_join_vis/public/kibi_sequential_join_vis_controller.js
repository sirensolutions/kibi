define(function (require) {

  const module = require('ui/modules').get('kibana/kibi_sequential_join_vis', ['kibana']);
  const _ = require('lodash');
  const chrome = require('ui/chrome');

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  module.controller('KibiSequentialJoinVisController',
    function (kibiState, $scope, $rootScope, Private, $http, $location, createNotifier, Promise) {

      $scope.configMode = /\/visualize\/(create|edit).*/.test($location.path());

      const notify = createNotifier({
        location: 'Kibi Relational filter'
      });

      const kibiSequentialJoinVisHelper = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));
      const currentDashboardId = kibiState._getCurrentDashboardId();

      if (!kibiState.isSirenJoinPluginInstalled()) {
        notify.error('This version of Kibi Relational filter requires the SIREn Join plugin. Please install it and restart Kibi.');
      }

      // Update the counts on each button of the related filter
      var _updateCounts = function (buttons, dashboardId) {
        if ($scope.configMode || !buttons || !buttons.length) {
          return Promise.resolve([]);
        }

        return Promise.all(_.map(buttons, (button) => {
          return kibiSequentialJoinVisHelper.getJoinSequenceFilter(dashboardId, button).then((joinSeqFilter) => {
            button.joinSeqFilter = joinSeqFilter;
            return kibiSequentialJoinVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter)
            .then((query) => {
              return {
                query: query,
                button: button
              };
            });
          });
        })).then((results) => {
          let query = '';
          _.each(results, function (result) {
            query += `{"index": "${result.button.targetIndexPatternId}"}\n${JSON.stringify(result.query)}\n`;
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
        if (!$scope.configMode) {
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

      var off = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
        _updateCounts($scope.buttons, currentDashboardId);
      });
      $scope.$on('$destroy', off);

      // when autoupdate is on we detect the refresh here
      $scope.$watch('esResponse', function (resp) {
        if ($scope.configMode) {
          return;
        }
        let promise;
        if (!$scope.buttons || !$scope.buttons.length) {
          promise = _constructButtons();
        } else {
          promise = Promise.resolve($scope.buttons);
        }
        promise
        .then((buttons) => _updateCounts(buttons, currentDashboardId))
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
            return _updateCounts([ virtualButton ], this.redirectToDashboard).then(() => virtualButton.targetCount).catch(notify.error);
          };
          for (let i = 0; i < buttons.length; i++) {
            buttons[i].getSourceCount = getSourceCount;
            // Returns the count of documents involved in the join
            $scope.buttons[buttons[i].btnIndex] = buttons[i];
          }
        })
        .catch(notify.error);
      });

      $scope.$watch('vis.params.buttons', function () {
        _constructButtons();
      }, true);
    });
});
