import _ from 'lodash';

import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import { IndexPatternAuthorizationError } from 'ui/errors';

import { onVisualizePage } from 'ui/kibi/utils/on_page';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { KibiSequentialJoinVisHelperFactory } from 'ui/kibi/helpers/kibi_sequential_join_vis_helper';
import { RelationsHelperFactory }  from 'ui/kibi/helpers/relations_helper';
import { DelayExecutionHelperFactory } from 'ui/kibi/helpers/delay_execution_helper';
import { SearchHelper } from 'ui/kibi/helpers/search_helper';
import isJoinPruned from 'ui/kibi/helpers/is_join_pruned';

function controller($scope, $rootScope, Private, kbnIndex, config, kibiState, getAppState, globalState, createNotifier,
  savedDashboards, savedSearches, dashboardGroups, kibiMeta, es, ontologyClient) {
  const DelayExecutionHelper = Private(DelayExecutionHelperFactory);
  const searchHelper = new SearchHelper(kbnIndex);
  const edit = onVisualizePage();

  const notify = createNotifier({
    location: 'Kibi Automatic Relational filter'
  });
  const appState = getAppState();

  const relationsHelper = Private(RelationsHelperFactory);
  const kibiSequentialJoinVisHelper = Private(KibiSequentialJoinVisHelperFactory);
  const currentDashboardId = kibiState._getCurrentDashboardId();
  $scope.currentDashboardId = currentDashboardId;
  const queryFilter = Private(FilterBarQueryFilterProvider);

  $scope.btnCountsEnabled = function () {
    return config.get('kibi:enableAllRelBtnCounts');
  };

  $scope.getButtonLabel = function (button) {
    const count = button.targetCount ? button.targetCount : 0;
    return button.label.replace('{0}', count);
  }

  const buttonMetaCallback = function (button, meta) {
    if (button.forbidden) {
      button.warning = 'Access to an index referred by this button is forbidden.';
      return;
    }
    if (meta.error) {
      const error = JSON.stringify(meta.error, null, ' ');
      if (error.match(/ElasticsearchSecurityException/)) {
        button.warning = 'Access to an index referred by this button is forbidden.';
        notify.error(error);
      } else if (error.match(/index_not_found_exception/)) {
        // do not notify about missing index error
        button.warning = 'Index referred by this button does not exist.';
      } else {
        button.warning = `Got an unexpected error while computing this button's count.`;
        notify.error(JSON.stringify(error, null, ' '));
      }
      return;
    }
    button.targetCount = meta.hits.total;
    button.warning = '';
    if (isJoinPruned(meta)) {
      button.isPruned = true;
      button.warning = 'Notice: This is a sample of the results because join operation was pruned';
    }
  };

  const updateCounts = function (results, scope) {
    const metaDefinitions = _.map(results, result => {
      const definition = result.button;
      // adding unique id as required by kibiMeta
      definition.id =
        result.button.sourceDashboardId ? result.button.sourceDashboardId : '' +
        result.button.targetDashboardId ? result.button.targetDashboardId : '' +
        relationsHelper.getJoinIndicesUniqueID(
          result.button.sourceIndexPatternId,
          result.button.sourceIndexPatternType,
          result.button.sourceField,
          result.button.targetIndexPatternId,
          result.button.targetIndexPatternType,
          result.button.targetField,
        );

      return {
        definition: definition,
        callback: function (error, meta) {
          if (error) {
            notify.error(error);
          }
          if (scope && scope.multiSearchData) {
            const queryParts = result.button.query.split('\n');
            const stats = {
              index: result.button.targetIndexPatternId,
              type: result.button.targetIndexPatternType,
              meta: {
                label: result.button.label
              },
              response: meta,
              query: JSON.parse(queryParts[1])
            };
            if (isJoinPruned(meta)) {
              stats.pruned = true;
            }
            $scope.multiSearchData.add(stats);
          }
          buttonMetaCallback(result.button, meta);
        }
      };
    });
    kibiMeta.getMetaForRelationalButtons(metaDefinitions);
  };

  // Update the counts on each button of the related filter
  const _addButtonQuery = function (buttons, dashboardId, updateOnClick = false) {
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
        button.disabled = false;
        if ($scope.btnCountsEnabled() || updateOnClick) {
          return kibiSequentialJoinVisHelper.buildCountQuery(button.targetDashboardId, joinSeqFilter)
          .then((query) => {
            button.query = searchHelper.optimize(indices, query, button.targetIndexPatternId);
            return { button, indices };
          });
        } else {
          return { button, indices };
        }
      })
      .catch((error) => {
        // If computing the indices failed because of an authorization error
        // set indices to an empty array and mark the button as forbidden.
        if (error instanceof IndexPatternAuthorizationError) {
          button.forbidden = true;
          button.disabled = true;
          return { button, indices: [] };
        }
        if ($scope.btnCountsEnabled() || updateOnClick) {
          return kibiSequentialJoinVisHelper.buildCountQuery(button.targetDashboardId)
          .then((query) => {
            button.query = searchHelper.optimize([], query, button.targetIndexPatternId);
            return { button, indices: [] };
          });
        } else {
          return { button, indices: [] };
        }
      });
    })).catch(notify.error);
  };

  $scope.getCurrentDashboardBtnCounts = function () {
    _addButtonQuery($scope.buttons, currentDashboardId, true) // TODO take care about this true parameter
    .then(results => {
      updateCounts(results, $scope);
    });
  };

  const delayExecutionHelper = new DelayExecutionHelper(
    (data, alreadyCollectedData) => {
      alreadyCollectedData.dashboardId = data.dashboardId;
      alreadyCollectedData.buttons = data.buttons;
    },
    (data) => {
      _addButtonQuery(data.buttons, data.dashboardId)
      .then(results => {
        updateCounts(results, $scope);
      });
    },
    750,
    DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
  );

  const _collectUpdateCountsRequest = function (buttons, dashboardId) {
    if (edit || !buttons || !buttons.length) {
      return Promise.resolve([]);
    }
    delayExecutionHelper.addEventData({
      buttons: buttons,
      dashboardId: dashboardId
    });
    return Promise.resolve(buttons);
  };

  const getNewButtons = function (relations, existingButtons) {
    const relationsWithNoButton = [];
    const newButtons = [];
    const promises = [];
    _.each(relations, (rel) => {
      const button = _.find(existingButtons, (button) => {
        return button.indexRelationId === rel.id;
      });
      if (!button && rel.domain.type === 'INDEX_PATTERN') {
        relationsWithNoButton.push(rel);
      }
    });

    _.each(relationsWithNoButton, (rel) => {
      const button = {
        indexRelationId: rel.id,
        domainIndexPattern: rel.domain.id,
        sourceDashboardId: null,
        targetDashboardId: null,
        status: 'default'
      };
      if (rel.range.type === 'VIRTUAL_ENTITY') {
        button.type = 'VIRTUAL_ENTITY';
        promises.push(ontologyClient.getEntities()
          .then((entities) => {
            const virtualEntity = _.find(entities, (entity) => { return entity.id === rel.range.id });
            button.id = rel.id + '-ve-' + rel.range.id;
            button.label = rel.directLabel + ' (~{0} ' + virtualEntity.label + ')';
            newButtons.push(button);
          })
        );
      } else if (rel.range.type === 'INDEX_PATTERN') {
        button.type = 'INDEX_PATTERN';
        promises.push(savedDashboards.find()
          .then((savedDashboards) => {
            return savedSearches.find()
            .then((savedSearches) => {
              // console.log('savedSearches');
              // console.log(savedSearches.hits);

              const compatibleSavedSearches = _.filter(savedSearches.hits, (savedSearch) => {
                const searchSource = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
                return searchSource.index === rel.range.id;
              });

              _.each(compatibleSavedSearches, (compatibleSavedSearch) => {
                const compatibleDashboards = _.filter(savedDashboards.hits, (savedDashboard) => {
                  return savedDashboard.savedSearchId === compatibleSavedSearch.id;
                });
                // console.log('compatibleDashboards');
                // console.log(compatibleDashboards);
                _.each(compatibleDashboards, (compatibleDashboard) => {
                  const clonedButton = _.clone(button);
                  clonedButton.targetDashboardId = compatibleDashboard.id;
                  clonedButton.id = rel.id + '-ip-' + compatibleDashboard.title;
                  clonedButton.label = rel.directLabel + ' (~{0} ' + compatibleDashboard.title + ')';
                  newButtons.push(clonedButton);
                });

              });
            });


          })
        );
      }
    });
    return Promise.all(promises).then(() => {
      console.log('newButtons');
      console.log(newButtons);
      return newButtons;
    });
  };

  const _constructButtons = $scope._constructButtons = function () {
    return ontologyClient.getRelations().then((relations) => {
      return getNewButtons(relations, []).then((newButtons) => {
        const originalButtonDefs = _.filter(newButtons,
          btn => relationsHelper.validateRelationIdWithRelations(btn.indexRelationId, relations));

        // $scope.vis.error = '';
        // if (originalButtonDefs.length !== newButtons.length) {
        //   $scope.vis.error = 'Invalid configuration of the Kibi relational filter visualization';
        //   if (!edit) {
        //     return Promise.reject($scope.vis.error);
        //   }
        // }
        const difference = newButtons.length - originalButtonDefs.length;
        if (!edit && difference === 1) {
          notify.warning(difference + ' button refers to a non existing relation');
        } else if (!edit && difference > 1) {
          notify.warning(difference + ' buttons refer to a non existing relation');
        }

        if (!edit) {
          let getButtonDefs;
          const kacConfiguration = chrome.getInjected('kacConfiguration');
          if (kacConfiguration && kacConfiguration.acl && kacConfiguration.acl.enabled === true) {
            getButtonDefs = savedDashboards.find().then((dashboards) => {
              // iterate over the original definitions and remove the ones that depend on missing dashboards
              return _.filter(originalButtonDefs, (btn) => {
                // sourceDashboardId is optional
                if (btn.sourceDashboardId && !_.find(dashboards.hits, 'id', btn.sourceDashboardId)) {
                  return false;
                }
                if (!_.find(dashboards.hits, 'id', btn.targetDashboardId)) {
                  return false;
                }
                return true;
              });
            });
          } else {
            getButtonDefs = Promise.resolve(originalButtonDefs);
          }

          return getButtonDefs.then((buttonDefs) => {
            const dashboardIds = [ currentDashboardId ];
            _.each(buttonDefs, function (button) {
              if (!_.contains(dashboardIds, button.targetDashboardId)) {
                dashboardIds.push(button.targetDashboardId);
              }
            });

            return kibiState._getDashboardAndSavedSearchMetas(dashboardIds, false)
            .then((metas) => {
              return {
                metas,
                buttonDefs
              };
            });
          })
          .then(({ metas, buttonDefs }) => {
            let currentDashboardIndex;
            const dashboardIdIndexPair = new Map();

            for (let i = 0; i < metas.length; i++) {
              dashboardIdIndexPair.set(metas[i].savedDash.id, metas[i].savedSearchMeta.index);
              if (metas[i].savedDash.id === currentDashboardId) {
                currentDashboardIndex = metas[i].savedSearchMeta.index;
              }
            }

            if (!currentDashboardIndex) {
              return [];
            }

            const buttons = kibiSequentialJoinVisHelper.constructButtonsArray(
              buttonDefs,
              currentDashboardIndex,
              currentDashboardId,
              dashboardIdIndexPair
            );

            // disable buttons until buttons are ready
            _.each(buttons, function (button) {
              button.disabled = true;
            });

            // retain the buttons order
            for (let i = 0; i < buttons.length; i++) {
              buttons[i].btnIndex = i;
            }
            if (!buttons.length) {
              $scope.vis.error =
                `The relational filter visualization "${$scope.vis.title}" is not configured for this dashboard. ` +
                `No button has a source index matching the current dashboard index: ${currentDashboardIndex}.`;
            }

            // populate subButtons for EID buttons
            const subButtonPromises = [];
            _.each(buttons, (button) => {
              if (button.type === 'VIRTUAL_ENTITY') {
                const cardinalityQuery = {
                  index: button.sourceIndexPatternId,
                  body: {
                      size : 0,
                      aggs : {
                        distinct_field : { cardinality : { field : button.sourceField } }
                      }
                  }
                };

                subButtonPromises.push(
                  es.search(cardinalityQuery)
                  .then((esResult) => {
                    // button.targetCount = esResult.count;
                    button.targetCount = esResult.aggregations.distinct_field.value;
                    button.sub = {};

                    return ontologyClient.getRelationsByDomain(button.targetIndexPatternId).then((relationsByDomain) => {
                      console.log('button');
                      console.log(button);
                      console.log(relationsByDomain);
                      const dashboardPromises = [];
                      _.each(relationsByDomain, (relByDomain) => {
                        if (relByDomain.range.id !== button.sourceIndexPatternId) {
                          dashboardPromises.push(
                            savedSearches.find().then((savedSearches) => {
                              // filter the savedSearch with the same indexPattern
                              const relevantSavedSearchIds = new Set();
                              _.each(savedSearches.hits, (savedSearch) => {
                                const json = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
                                if (json.index === relByDomain.range.indexPattern) {
                                  relevantSavedSearchIds.add(savedSearch.id);
                                }
                              });

                              return savedDashboards.find().then((savedDashboards) => {
                                const availableDashboards = [];
                                // console.log(savedDashboards);
                                _.each(savedDashboards.hits, (savedDashboard) => {
                                  if (relevantSavedSearchIds.has(savedDashboard.savedSearchId)) {
                                    availableDashboards.push( {
                                      id: savedDashboard.id,
                                      title: savedDashboard.title
                                    });
                                  }
                                });

                                _.each(availableDashboards, (availableDashboard) => {
                                  const subButton = kibiSequentialJoinVisHelper.constructSubButton(button,
                                    availableDashboard, relByDomain);

                                  const updateSourceCount = function (currentDashboardId, callback) {
                                    const virtualButton = {
                                      sourceField: subButton.targetField,
                                      sourceIndexPatternId: subButton.targetIndexPatternId,
                                      sourceIndexPatternType: subButton.targetIndexPatternType,
                                      targetField: subButton.sourceField,
                                      targetIndexPatternId: subButton.sourceIndexPatternId,
                                      targetIndexPatternType: subButton.sourceIndexPatternType,
                                      targetDashboardId: currentDashboardId,
                                      type: 'INDEX_PATTERN'
                                    };

                                    return _addButtonQuery.call(self, [ virtualButton ], this.targetDashboardId)
                                    .then(results => {
                                      updateCounts(results, $scope);
                                      return results;
                                    })
                                    .catch(notify.error);
                                  };
                                  subButton.updateSourceCount = updateSourceCount;

                                  kibiSequentialJoinVisHelper.addClickHandlerToButton(subButton);

                                  let key = rel.directLabel;
                                  if (!button.sub[key]) {
                                    button.sub[key] = [];
                                  }
                                  button.sub[key].push(subButton);
                                });




                              });
                            })
                          );
                        }
                      });
                      return Promise.all(dashboardPromises);
                    });
                  })
                );
              }
            });

            return Promise.all(subButtonPromises).then(() => {
              return buttons;
            });
          })
          .catch(notify.error);
        } else {
          $scope.buttons = kibiSequentialJoinVisHelper.constructButtonsArray(originalButtonDefs);
        }
      });
    });
  };

  /*
   * Update counts in reaction to events
   */

  const updateButtons = function (reason) {
    if (!kibiState.isSirenJoinPluginInstalled()) {
      notify.error(
        'This version of Kibi Relational filter requires the Vanguard plugin. Please install it and restart Kibi.'
      );
      return;
    }

    if (edit) {
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
      const updateSourceCount = function (currentDashboardId, callback) {
        const virtualButton = {
          sourceField: this.targetField,
          sourceIndexPatternId: this.targetIndexPatternId,
          sourceIndexPatternType: this.targetIndexPatternType,
          targetField: this.sourceField,
          targetIndexPatternId: this.sourceIndexPatternId,
          targetIndexPatternType: this.sourceIndexPatternType,
          targetDashboardId: currentDashboardId
        };

        return _addButtonQuery.call(self, [ virtualButton ], this.targetDashboardId)
        .then(results => {
          updateCounts(results, $scope);
          return results;
        })
        .catch(notify.error);
      };

      for (let i = 0; i < buttons.length; i++) {
        buttons[i].updateSourceCount = updateSourceCount;
        // Returns the count of documents involved in the join
        $scope.buttons[buttons[i].btnIndex] = buttons[i];
      }
    })
    .catch(notify.error);
  };

  const kibiDashboardChangedOff = $rootScope.$on('kibi:dashboard:changed', updateButtons.bind(this, 'kibi:dashboard:changed'));

  $scope.$listen(kibiState, 'save_with_changes', function (diff) {
    if (diff.indexOf(kibiState._properties.dashboards) !== -1) {
      updateButtons.call(this, 'dashboards in kibistate changes');
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
    if ((timefilter.refreshInterval.display !== 'Off')
        && (timefilter.refreshInterval.pause === false)) {
      const currentDashboard = kibiState._getCurrentDashboardId();
      if (!currentDashboard) {
        return;
      }

      updateButtons('courier:searchRefresh');
    }
  });

  $scope.$on('$destroy', function () {
    delayExecutionHelper.cancel();
    kibiDashboardChangedOff();
    removeAutorefreshHandler();
    kibiMeta.flushQueues();
  });

  $scope.hoverIn = function (button) {
    dashboardGroups.setGroupHighlight(button.targetDashboardId);
  };

  $scope.hoverOut = function () {
    dashboardGroups.resetGroupHighlight();
  };

  // init
  updateButtons('init');

  if (edit) {
    $scope.$watch('vis.params.buttons', function () {
      _constructButtons();
    }, true);
  }
};

uiModules
.get('kibana/kibi_auto_join_vis', ['kibana'])
.controller('KibiAutoJoinVisController', controller);
