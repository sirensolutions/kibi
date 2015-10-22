define(function (require) {
  // get the kibana/sindicetech_relational_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/sindicetech_relational_vis', ['kibana']);
  var _ = require('lodash');
  var getSavedSearchMeta =  require('components/kibi/count_helper/lib/get_saved_search_meta');

  module.controller(
    'SindicetechRelationalVisController',
    function ($scope, $rootScope, Private, $http, Notifier, Promise, timefilter,
              indexPatterns, savedDashboards, savedSearches) {

      var notify = new Notifier({
        location: 'Relational Widget'
      });

      var queryHelper      = Private(require('components/sindicetech/query_helper/query_helper'));
      var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
      var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
      var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      var kibiTimeHelper   = Private(require('components/kibi/kibi_time_helper/kibi_time_helper'));
      var countHelper      = Private(require('components/kibi/count_helper/count_helper'));


      var currentDashboardId = urlHelper.getCurrentDashboardId();

      if (!joinFilterHelper.isFilterJoinPluginInstalled()) {
        notify.error('This version of Kibi Relational filter requires the SIREn Join plugin. Please install it and restart Kibi.');
      }

      /**
       * Merges the button join spec with the target join.
       */
      var mergeTargetJoin = function (button, targetJoin) {
        targetJoin = _.cloneDeep(targetJoin);
        return new Promise(function (fulfill, reject) {
          if (!targetJoin) {
            fulfill(button);
            return;
          }
          var relations;
          var indexes;

          var existingJoin = button.joinFilter;

          indexes = targetJoin.join.indexes.concat(existingJoin.join.indexes);
          existingJoin.join.indexes = _.uniq(_.union(indexes, existingJoin.join.indexes), false, function (index) {
            return index.id + index.type;
          });

          relations = targetJoin.join.relations.concat(existingJoin.join.relations);
          existingJoin.join.relations = _.uniq(_.union(relations, existingJoin.join.relations), false, function (relation) {
            return relation[0] < relation[1] ? relation[0] + relation[1] : relation[1] + relation[0];
          });

          var targetFilters = targetJoin.join.filters;
          _.each(targetFilters, function (filters, index) {
            var merged = filters;
            if (existingJoin.join.filters[index]) {
              merged = merged.concat(existingJoin.join.filters[index]);
            }
            merged = _.uniq(merged, false, function (filter) {
              return JSON.stringify(filter);
            });
            existingJoin.join.filters[index] = merged;
          });

          button.joinFilter = existingJoin;
          fulfill(button);
        });
      };

      /**
       * Updates the source join.
       */
      var updateSourceJoin = function (button, existingJoin, currentDashboardSavedSearch) {
        existingJoin = _.cloneDeep(existingJoin);
        return new Promise( function (fulfill, reject) {
          if (!existingJoin) {
            fulfill(button);
            return;
          }
          var relations;
          var indexes;

          // 1 change focus
          existingJoin.join.focus = button.targetIndexPatternId;

          // 2 add indexes
          indexes = [
            {id: button.sourceIndexPatternId, type: button.sourceIndexPatternType},
            {id: button.targetIndexPatternId, type: button.targetIndexPatternType}
          ];
          existingJoin.join.indexes = _.uniq(_.union(indexes, existingJoin.join.indexes), false, function (index) {
            return index.id + index.type;
          });

          // 3 add relations
          relations = [
            [button.sourceIndexPatternId + '.' + button.sourceField, button.targetIndexPatternId + '.' + button.targetField]
          ];
          existingJoin.join.relations = _.uniq(_.union(relations, existingJoin.join.relations), false, function (relation) {
            return relation[0] < relation[1] ? relation[0] + relation[1] : relation[1] + relation[0];
          });

          // 4 add filters for the source
          if (!existingJoin.join.filters[button.sourceIndexPatternId]) {
            existingJoin.join.filters[button.sourceIndexPatternId] = [];
          }

          var existingFilters = existingJoin.join.filters[button.sourceIndexPatternId];

          _.each(_.map(_.filter(urlHelper.getCurrentDashboardFilters(), function (filter) {
            return !filter.join;
          }), function (filter) {
            var negate = filter.meta.negate;
            delete filter.meta;
            if (negate === true) {
              return {
                not: filter
              };
            } else {
              return filter;
            }
          }), function (filter) {
            existingFilters.push(filter);
          });

          //5 add query for the source
          var fQuery = urlHelper.getCurrentDashboardQuery();
          if (fQuery && !kibiStateHelper.isAnalyzedWildcardQueryString(fQuery)) {
            existingFilters.push({
              query: fQuery
            });
          }

          //6 Add filters and query from the saved search
          var savedSearchMeta = getSavedSearchMeta(currentDashboardSavedSearch);
          if (savedSearchMeta.filter && savedSearchMeta.filter.length > 0 ) {
            existingFilters = existingFilters.concat(savedSearchMeta.filter);
          }
          if (savedSearchMeta.query && !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
            existingFilters.push({
              query: savedSearchMeta.query
            });
          }

          // Remove duplicates
          existingJoin.join.filters[button.sourceIndexPatternId] =
            _.uniq(existingFilters, false, function (filter) {
            return JSON.stringify(filter);
          });

          button.joinFilter = existingJoin;

          indexPatterns.get(button.sourceIndexPatternId).then(function (indexPattern) {
            var timeFilter = timefilter.get(indexPattern);
            if (timeFilter) {
              kibiTimeHelper.updateTimeFilterForDashboard(urlHelper.getCurrentDashboardId(), timeFilter)
                .then(function (updatedTimeFilter) {
                  if (!existingJoin.join.filters[button.sourceIndexPatternId]) {
                    existingJoin.join.filters[button.sourceIndexPatternId] = [];
                  }
                  existingJoin.join.filters[button.sourceIndexPatternId].push(updatedTimeFilter);
                  button.joinFilter = existingJoin;
                  fulfill(button);
                }).catch(function (err) {
                  notify.error(err);
                });
            } else {
              fulfill(button);
            }
          }).catch(function (err) {
            notify.error(err);
          });

        });
      };

      /**
       * Updates the target dashboard join specification with the join specification
       * built for the current dashboard.
       */
      var updateTargetDashboardJoin = function (button) {
        return new Promise(function (fulfill, reject) {
          savedDashboards.get(button.redirectToDashboard).then(function (targetSavedDashboard) {
            if (targetSavedDashboard.savedSearchId) {
              savedSearches.get(targetSavedDashboard.savedSearchId).then(function (savedSearch) {
                var targetDashboardFilters = kibiStateHelper.getFiltersForDashboardId(targetSavedDashboard.id);

                var targetDashboardJoinFilter = null;
                if (targetDashboardFilters) {
                  targetDashboardJoinFilter = _.find(targetDashboardFilters, function (filter) {
                    return filter.join;
                  });
                }
                mergeTargetJoin(button, targetDashboardJoinFilter).then(function (button) {
                  var extraFilters = [button.joinFilter];
                  countHelper.constructCountQuery(button.redirectToDashboard, savedSearch, extraFilters, null)
                    .then(function (query) {
                      fulfill(query);
                    }).catch(function (err) {
                      notify.error(err);
                    });
                });
              });
            }
          });
        });
      };

      /**
       * Creates a join for the current dashboard saved search.
       */
      var buildSourceJoin = function (button, currentDashboardSavedSearch) {
        return new Promise(function (fulfill, reject) {

          var indexes;
          var relations;

          // there was no jon filter lets build one
          // assemble all components for constructing the join filter
          var focus = button.targetIndexPatternId;
          indexes = [
            {id: button.sourceIndexPatternId, type: button.sourceIndexPatternType},
            {id: button.targetIndexPatternId, type: button.targetIndexPatternType}
          ];

          relations = [
            [button.sourceIndexPatternId + '.' + button.sourceField, button.targetIndexPatternId + '.' + button.targetField]
          ];

          var filters = {};
          filters[button.sourceIndexPatternId] =
            _.map(_.filter(urlHelper.getCurrentDashboardFilters(), function (filter) {
              return !filter.join;
            }), function (filter) {
              var negate = filter.meta.negate;
              delete filter.meta;
              if (negate === true) {
                return {
                  not: filter
                };
              } else {
                return filter;
              }
            });

          var queries = {};
          queries[button.sourceIndexPatternId] = urlHelper.getCurrentDashboardQuery();

          var indexToDashboardMap = {};
          indexToDashboardMap[button.sourceIndexPatternId] = urlHelper.getCurrentDashboardId();
          indexToDashboardMap[button.targetIndexPatternId] = button.redirectToDashboard;

          var savedSearchMeta = getSavedSearchMeta(currentDashboardSavedSearch);
          if (savedSearchMeta.filter && savedSearchMeta.filter.length > 0 ) {
            filters[button.sourceIndexPatternId] = filters[button.sourceIndexPatternId].concat(savedSearchMeta.filter);
          }
          if (savedSearchMeta.query && !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
            filters[button.sourceIndexPatternId].push({
              query: savedSearchMeta.query
            });
          }

          // once all components are ready assemble the joinFilter
          queryHelper.constructJoinFilter(
            focus,
            indexes,
            relations,
            filters,
            queries,
            indexToDashboardMap
          ).then(function (joinFilter) {
              button.joinFilter = joinFilter;
              fulfill(button);
            });

        });

      };

      // Update the counts on each button of the related filter
      var _updateCounts = function () {
        var countQueries = [];
        _.each($scope.buttons, function (button) {


          countQueries.push(
            new Promise( function (fulfill, reject) {

              savedDashboards.get(urlHelper.getCurrentDashboardId()).then(function (savedCurrentDashboard) {
                if (savedCurrentDashboard.savedSearchId) {
                  savedSearches.get(savedCurrentDashboard.savedSearchId).then(function (currentDashboardSavedSearch) {

                    var existingJoin = _.cloneDeep(urlHelper.getJoinFilter());
                    if (existingJoin && existingJoin.meta && existingJoin.meta.negate === true) {
                      button.disabled = true;
                      button.$label = button.label;
                      button.label = 'Not supported when join filter is negated';
                    } else {
                      button.disabled = false;
                      if (button.$label) {
                        button.label = button.$label;
                      }
                    }

                    if (existingJoin) {
                      updateSourceJoin(button, existingJoin, currentDashboardSavedSearch).then(function (button) {
                        updateTargetDashboardJoin(button).then(function (query) {
                          fulfill({
                            query: query,
                            button: button
                          });
                        }).catch(function (err) {
                          notify.error(err);
                        });
                      }).catch(function (err) {
                        notify.error(err);
                      });
                    } else {
                      buildSourceJoin(button, currentDashboardSavedSearch).then(function (button) {
                        updateTargetDashboardJoin(button).then(function (query) {
                          fulfill({
                            query: query,
                            button: button
                          });
                        }).catch(function (err) {
                          notify.error(err);
                        });
                      }).catch(function (err) {
                        notify.error(err);
                      });
                    }

                  });
                }
              });
            })
          );
        });


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
          });
        }).catch(function (err) {
          notify.error(err);
        });
      };


      var _constructButtonsArray = function (currentDashboardIndexId) {
        return _.chain($scope.vis.params.buttons)
        .filter(function (buttonDef) {
          if (!currentDashboardIndexId) {
            return buttonDef.sourceIndexPatternId && buttonDef.label;
          }
          return buttonDef.sourceIndexPatternId === currentDashboardIndexId && buttonDef.label;
        })
        .map(function (buttonDef) {
          var button = _.clone(buttonDef);
          button.joinFilter = null;

          button.click = function () {
            if (!currentDashboardIndexId) {
              return;
            }
            kibiStateHelper.saveFiltersForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardFilters());
            kibiStateHelper.saveQueryForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardQuery());


            if (button.filterLabel) {
              this.joinFilter.meta.value = button.filterLabel
              .replace(/\$COUNT/g, this.sourceCount)
              .replace(/\$DASHBOARD/g, urlHelper.getCurrentDashboardId());
            } else {
              this.joinFilter.meta.value = '... related to (' + this.sourceCount + ') from ' + urlHelper.getCurrentDashboardId();
            }


            if (this.joinFilter) {
              // get filters from dashboard we would like to switch to
              var targetDashboardQuery   = kibiStateHelper.getQueryForDashboardId(this.redirectToDashboard);
              var targetDashboardFilters = kibiStateHelper.getFiltersForDashboardId(this.redirectToDashboard);
              var targetDashboardTimeFilter = kibiStateHelper.getTimeForDashboardId(this.redirectToDashboard);

              // add or Filter and switch
              if (!targetDashboardFilters) {
                targetDashboardFilters = [this.joinFilter];
              } else {
                joinFilterHelper.replaceOrAddJoinFilter(targetDashboardFilters, this.joinFilter);
              }

              // switch to target dashboard
              urlHelper.replaceFiltersAndQueryAndTime(
                targetDashboardFilters,
                targetDashboardQuery,
                targetDashboardTimeFilter);
              urlHelper.switchDashboard(this.redirectToDashboard);
            } else {
              // just redirect to the target dashboard
              urlHelper.switchDashboard(this.redirectToDashboard);
            }

          };
          return button;
        }).value();
      };


      var _constructButtons = function () {
        if (currentDashboardId) {
          // check that current dashboard has assigned indexPatternId
          savedDashboards.get(currentDashboardId).then(function (savedDashboard) {
            if (savedDashboard.savedSearchId) {
              savedSearches.get(savedDashboard.savedSearchId)
              .then(function (dashboardSavedSearch) {
                $scope.buttons = _constructButtonsArray(dashboardSavedSearch.searchSource._state.index.id);
              })
              .catch(notify.error);
            } else {
              notify.warning('The current dashboard, ' + currentDashboardId + ', ' +
                             'has no SavedSearch set. ' +
                             'Please save the dashboard to set one');
            }
          });
        } else {
          $scope.buttons = _constructButtonsArray();
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

      $scope.$watch('esResponse', function (resp) {
        if ($scope.buttons) {
          _updateCounts();
          _.each($scope.buttons, function (button) {
            button.sourceCount = resp.hits.total;
          });
        }
      });

      $scope.$watch('vis.params.buttons', function () {
        _constructButtons();
      }, true);

    }); // end of controller
});
