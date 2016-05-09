define(function (require) {

  var module = require('ui/modules').get('kibana/kibi_sequential_join_vis', ['kibana']);
  var _ = require('lodash');
  var getSavedSearchMeta =  require('ui/kibi/helpers/count_helper/lib/get_saved_search_meta');
  var chrome = require('ui/chrome');

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  module.controller('KibiSequentialJoinVisController',
    function ($scope, $rootScope, Private, $http, $location, createNotifier, Promise, savedDashboards, savedSearches) {

      $scope.configMode = /\/visualize\/(create|edit).*/.test($location.path());

      var notify = createNotifier({
        location: 'Kibi Relational filter'
      });

      var queryHelper      = Private(require('ui/kibi/helpers/query_helper'));
      var urlHelper        = Private(require('ui/kibi/helpers/url_helper'));
      var joinFilterHelper = Private(require('ui/kibi/helpers/join_filter_helper/join_filter_helper'));
      var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
      var kibiTimeHelper   = Private(require('ui/kibi/helpers/kibi_time_helper'));
      var countHelper      = Private(require('ui/kibi/helpers/count_helper/count_helper'));
      var relVisHelper     = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));


      var currentDashboardId = urlHelper.getCurrentDashboardId();

      if (!joinFilterHelper.isSirenJoinPluginInstalled()) {
        notify.error('This version of Kibi Relational filter requires the SIREn Join plugin. Please install it and restart Kibi.');
      }

      // Update the counts on each button of the related filter
      var _updateCounts = function () {

        if ($scope.configMode) {
          return Promise.resolve('configMode');
        }
        var currentDashboardId = urlHelper.getCurrentDashboardId();

        var countQueries = _.map($scope.buttons, function (button) {
          return urlHelper.getDashboardAndSavedSearchMetas([ currentDashboardId ]).then(([ { savedDash, savedSearchMeta } ]) => {
            // check that there are any join_seq filters already on this dashboard
            //    if there is 0:
            //      create new join_seq filter with 1 relation from current dashboard to target dashboard
            //    if there is only 1:
            //      take the join_sequence filter and add to the sequence
            //      - new relation from current dashboard to target dashboard
            //    if there is more then 1:
            //      create join_sequence filter with:
            //      - group from all existing join_seq filters and add this group at the top
            //      - new relation from current dashboard to target dashboard

            var existingJoinFilters = _.cloneDeep(urlHelper.getFiltersOfType('join_sequence'));
            if (existingJoinFilters.length === 0) {

              return relVisHelper.buildNewJoinSeqFilter(button, savedSearchMeta)
                .then(function (joinSeqFilter) {
                  button.joinSeqFilter = joinSeqFilter;
                  return relVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter)
                    .then(function (query) {
                      return Promise.resolve({
                        query: query.query,
                        button: button
                      });
                    });
                });

            } else if (existingJoinFilters.length === 1) {

              return relVisHelper.addRelationToJoinSeqFilter(button, savedSearchMeta, existingJoinFilters[0])
                .then(function (joinSeqFilter) {
                  button.joinSeqFilter = joinSeqFilter;
                  return relVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter)
                    .then(function (query) {
                      return Promise.resolve({
                        query: query.query,
                        button: button
                      });
                    });
                });

            } else if (existingJoinFilters.length > 1) {

              // build join sequence + add a group of sequances to the top of the array
              return relVisHelper.buildNewJoinSeqFilter(button, savedSearchMeta).then(function (joinSeqFilter) {

                // here create a group from existing ones and add it on the top

                var group = relVisHelper.composeGroupFromExistingJoinFilters(existingJoinFilters);
                joinSeqFilter.join_sequence.unshift(group);

                button.joinSeqFilter = joinSeqFilter;
                return relVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter).then(function (query) {
                  return Promise.resolve({
                    query: query.query,
                    button: button
                  });
                });
              });
            }
          });
        });

        return Promise.all(countQueries).then(function (results) {
          var query = '';
          _.each(results, function (result) {
            query += '{"index" : "' + result.button.targetIndexPatternId + '"}\n';
            query += JSON.stringify(result.query) + '\n';
          });

          // ?getCountsOnButton has no meanning it is just usefull to filter when inspecting requests
          return $http.post(chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnButton', query)
          .then(function (response) {
            const data = response.data;
            _.each(data.responses, function (hit, i) {
              if (hit.error) {
                notify.error(JSON.stringify(hit.error, null, ' '));
                return;
              }
              results[i].button.targetCount = hit.hits.total;
              results[i].button.warning = '';
              if (hit.coordinate_search) {
                var isPruned = false;
                var actions = hit.coordinate_search.actions;
                for (var j = 0; j < actions.length; j++) {
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
          });
        }).catch(notify.error);
      };


      var _updateSourceCount = function () {
        // here instead of relaying on others make a query and get the correct count for current dashboard
        var joinSequenceFilter = _.cloneDeep(urlHelper.getFiltersOfType('join_sequence'));
        return relVisHelper.buildCountQuery(currentDashboardId, joinSequenceFilter).then(function (query) {
          var queryS  = '{"index" : "' + query.index + '"}\n';
          queryS += JSON.stringify(query.query) + '\n';
          return $http.post(chrome.getBasePath() + '/elasticsearch/_msearch?getSourceCountForJoinSeqFilter', queryS)
          .then(function (response) {
            const data = response.data;
            if (data.responses && data.responses.length === 1 && data.responses[0].hits) {
              const hit = data.responses[0];
              if (hit.error) {
                notify.error(JSON.stringify(hit.error, null, ' '));
                return;
              }
              _.each($scope.buttons, function (button) {
                button.sourceCount = hit.hits.total;
              });
            }
          });
        });
      };

      var _constructButtons = function () {
        $scope.vis.error = '';
        if (currentDashboardId) {
          // check that current dashboard has assigned indexPatternId
          // use find to minimize numner of requests
          urlHelper.getDashboardAndSavedSearchMetas([ currentDashboardId ]).then(([ { savedDash, savedSearchMeta } ]) => {
            const index = savedSearchMeta.index;
            $scope.buttons = relVisHelper.constructButtonsArray($scope.vis.params.buttons, index);
            if (!$scope.buttons.length) {
              const msg = `The relational filter visualization "${$scope.vis.title}" is not configured for this dashboard. ` +
                `No button has a source index set to ${index}.`;
              $scope.vis.error = msg;
              notify.error(msg);
              return;
            }
            return _updateSourceCount();
          }).catch(notify.error);
        } else {
          $scope.buttons = relVisHelper.constructButtonsArray($scope.vis.params.buttons);
        }
      };

      var off = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
        if ($scope.buttons) {
          _updateCounts();
        }
      });
      $scope.$on('$destroy', off);

      // when autoupdate is on we detect the refresh here
      $scope.$watch('esResponse', function (resp) {
        if ($scope.buttons && $scope.buttons.length) {
          _updateCounts().then(_updateSourceCount()).catch(notify.error);
        }
      });

      $scope.$watch('vis.params.buttons', function () {
        _constructButtons();
      }, true);
    });
});
