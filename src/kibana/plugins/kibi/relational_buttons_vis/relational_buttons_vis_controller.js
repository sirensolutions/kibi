define(function (require) {

  var module = require('modules').get('kibana/kibi_relational_buttons_vis', ['kibana']);
  var _ = require('lodash');
  var getSavedSearchMeta =  require('components/kibi/count_helper/lib/get_saved_search_meta');

  module.controller(
    'KibiRelationalButtonsVisController',
    function ($scope, $rootScope, Private, $http, $location, Notifier, Promise, timefilter,
              indexPatterns, savedDashboards, savedSearches) {

      $scope.holder = {
        activeFetch: false
      };

      $scope.configMode = /\/visualize\/(create|edit).*/.test($location.path());

      var notify = new Notifier({
        location: 'Relational Widget'
      });

      var queryHelper      = Private(require('components/sindicetech/query_helper/query_helper'));
      var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
      var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
      var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      var kibiTimeHelper   = Private(require('components/kibi/kibi_time_helper/kibi_time_helper'));
      var countHelper      = Private(require('components/kibi/count_helper/count_helper'));
      var relVisHelper     = Private(require('plugins/kibi/relational_buttons_vis/relational_buttons_vis_helper'));


      var currentDashboardId = urlHelper.getCurrentDashboardId();

      if (!joinFilterHelper.isFilterJoinPluginInstalled()) {
        notify.error('This version of Kibi Relational filter requires the SIREn Join plugin. Please install it and restart Kibi.');
      }

      // Update the counts on each button of the related filter
      var _updateCounts = function () {

        if ($scope.configMode) {
          return;
        }

        var countQueries = [];
        _.each($scope.buttons, function (button) {


          countQueries.push(
            new Promise( function (fulfill, reject) {

              savedDashboards.get(urlHelper.getCurrentDashboardId()).then(function (savedSourceDashboard) {
                if (!savedSourceDashboard.savedSearchId) {
                  reject(new Error('Dashboard [' + savedSourceDashboard.id + '] should have savedSearchId'));
                } else {
                  savedSearches.get(savedSourceDashboard.savedSearchId).then(function (sourceDashboardSavedSearch) {

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

                      relVisHelper.buildNewJoinSeqFilter(
                        button,
                        sourceDashboardSavedSearch)
                      .then(function (joinSeqFilter) {
                        button.joinSeqFilter = joinSeqFilter;
                        relVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter).then(function (query) {
                          fulfill({
                            query: query.query,
                            button: button
                          });
                        }).catch(reject);
                      }).catch(reject);

                    } else if (existingJoinFilters.length === 1) {

                      relVisHelper.addRelationToJoinSeqFilter(
                        button,
                        sourceDashboardSavedSearch,
                        existingJoinFilters[0])
                      .then(function (joinSeqFilter) {

                        button.joinSeqFilter = joinSeqFilter;
                        relVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter).then(function (query) {
                          fulfill({
                            query: query.query,
                            button: button
                          });
                        }).catch(reject);
                      }).catch(reject);

                    } else if (existingJoinFilters.length > 1) {

                      // build join sequence + add a group of sequances to the top of the array
                      relVisHelper.buildNewJoinSeqFilter(button, sourceDashboardSavedSearch).then(function (joinSeqFilter) {

                        // here create a group from existing ones and add it on the top

                        var group = relVisHelper.composeGroupFromExistingJoinFilters(existingJoinFilters);
                        joinSeqFilter.join_sequence.unshift(group);

                        button.joinSeqFilter = joinSeqFilter;
                        relVisHelper.buildCountQuery(button.redirectToDashboard, joinSeqFilter).then(function (query) {
                          fulfill({
                            query: query.query,
                            button: button
                          });
                        }).catch(reject);
                      }).catch(reject);
                    }
                  });
                }
              });
            })
          );
        });

        $scope.holder.activeFetch = countQueries.length > 0;

        Promise.all(countQueries).then(function (results) {
          var query = '';
          _.each(results, function (result) {
            query += '{"index" : "' + result.button.targetIndexPatternId + '"}\n';
            query += JSON.stringify(result.query) + '\n';
          });

          // ?getCountsOnButton has no meanning it is just usefull to filter when inspecting requests
          $http.post('elasticsearch/_msearch?getCountsOnButton', query)
          .success(function (data) {
            _.each(data.responses, function (hit, i) {
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
            $scope.holder.activeFetch = false;
          });
        }).catch(function (err) {
          notify.error(err);
        });
      };


      var _updateSourceCount = function () {
        // here instead of relaying on others make a query and get the correct count for current dashboard
        var joinSequenceFilter = _.cloneDeep(urlHelper.getFiltersOfType('join_sequence'));
        relVisHelper.buildCountQuery(currentDashboardId, joinSequenceFilter).then(function (query) {
          var queryS  = '{"index" : "' + query.index.id + '"}\n';
          queryS += JSON.stringify(query.query) + '\n';
          $http.post('elasticsearch/_msearch?getSourceCountForJoinSeqFilter', queryS)
          .success(function (data) {
            if (data.responses && data.responses.length === 1 && data.responses[0].hits) {
              _.each($scope.buttons, function (button) {
                button.sourceCount = data.responses[0].hits.total;
              });
            }
          });
        });
      };

      var _constructButtons = function () {
        if (currentDashboardId) {
          // check that current dashboard has assigned indexPatternId
          savedDashboards.get(currentDashboardId).then(function (savedDashboard) {
            if (savedDashboard.savedSearchId) {
              savedSearches.get(savedDashboard.savedSearchId)
              .then(function (dashboardSavedSearch) {
                $scope.buttons = relVisHelper.constructButtonsArray(
                  $scope.vis.params.buttons, dashboardSavedSearch.searchSource._state.index.id
                );
                _updateSourceCount();
              })
              .catch(notify.error);
            } else {
              notify.warning('The current dashboard, ' + currentDashboardId + ', ' +
                             'has no SavedSearch set. ' +
                             'Please save the dashboard to set one');
            }
          });
        } else {
          $scope.buttons = relVisHelper.constructButtonsArray($scope.vis.params.buttons);
          _updateSourceCount();
        }
      }; // end of _constructButtons

      var off = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
        if ($scope.buttons) {
          _updateCounts();
        }
      });
      $scope.$on('$destroy', off);

      $scope.$watch('buttons', function () {
        if ($scope.buttons) {
          _updateCounts();
        }
      });

      // when autoupdate is on we detect the refresh here
      $scope.$watch('esResponse', function (resp) {
        if ($scope.buttons) {
          _updateCounts();
          _updateSourceCount();
        }
      });

      $scope.$watch('vis.params.buttons', function () {
        _constructButtons();
      }, true);

    }); // end of controller
});
