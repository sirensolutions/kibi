import _ from 'lodash';

import chrome from 'ui/chrome';
import Promise from 'bluebird';
import { uiModules } from 'ui/modules';
import { IndexPatternAuthorizationError } from 'ui/errors';

import { onVisualizePage } from 'ui/kibi/utils/on_page';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { KibiSequentialJoinVisHelperFactory } from 'ui/kibi/helpers/kibi_sequential_join_vis_helper';
import { RelationsHelperFactory }  from 'ui/kibi/helpers/relations_helper';
import { DelayExecutionHelperFactory } from 'ui/kibi/helpers/delay_execution_helper';
import { SearchHelper } from 'ui/kibi/helpers/search_helper';
import { QueryBuilderFactory } from 'ui/kibi/helpers/query_builder';
import isJoinPruned from 'ui/kibi/helpers/is_join_pruned';

function controller($scope, $rootScope, Private, kbnIndex, config, kibiState, getAppState, globalState, createNotifier,
  savedDashboards, savedSearches, dashboardGroups, kibiMeta, timefilter, es, ontologyClient) {
  const DelayExecutionHelper = Private(DelayExecutionHelperFactory);
  const searchHelper = new SearchHelper(kbnIndex);
  const edit = onVisualizePage();
  const queryBuilder = Private(QueryBuilderFactory);

  const notify = createNotifier({
    location: 'Siren Automatic Relational filter'
  });
  const appState = getAppState();

  const relationsHelper = Private(RelationsHelperFactory);
  const sirenSequentialJoinVisHelper = Private(KibiSequentialJoinVisHelperFactory);
  const currentDashboardId = kibiState.getCurrentDashboardId();
  $scope.currentDashboardId = currentDashboardId;
  const queryFilter = Private(FilterBarQueryFilterProvider);

  $scope.visibility = {
    // Root buttons
    buttons: {},
    // Relations inside a button
    subRelations: {},
    // target dashboards for the alternative view
    altViewDashboards: {}
  };

  $scope.btnCountsEnabled = function () {
    return config.get('siren:enableAllRelBtnCounts');
  };

  $scope.getButtonLabel = function (button, addApproximate) {
    let count = button.targetCount !== undefined ? button.targetCount : '?';
    if (addApproximate && button.targetCount !== undefined) {
      count = '~' + count;
    }
    return button.label.replace('{0}', count);
  };

  $scope.toggleLayout = function (button, $event) {
    $event.preventDefault();
    $event.stopPropagation();
    button.checkBox = !button.checkBox;
  };

  const buttonMetaCallback = function (button, meta) {
    if (button.forbidden) {
      button.targetCount = ''; // set to empty string to hide spinner
      button.warning = 'Access to an index referred by this button is forbidden.';
      return;
    }
    if (meta.error) {
      button.targetCount = ''; // set to empty string to hide spinner
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
    button.warning = ''; // set to empty string to hide any previous warning
    if (isJoinPruned(meta)) {
      button.isPruned = true;
      button.warning = 'Notice: This is a sample of the results because join operation was pruned';
    }
  };

  const updateCounts = function (results, scope) {
    const metaDefinitions = [];
    _.each(results, result => {
      const definition = result.button;
      // only make sense if query is there and not == null
      // query is null when counts disabled in advanced settings
      if (definition.query) {
        const sourceDash = result.button.sourceDashboardId ? result.button.sourceDashboardId : '';
        const targetDash = result.button.targetDashboardId ? result.button.targetDashboardId : '';

        metaDefinitions.push({
          definition: definition,
          callback: function (error, meta) {
            if (error) {
              buttonMetaCallback(result.button, { error });
            }
            if (meta) {
              buttonMetaCallback(result.button, meta);
            }

            if (scope && scope.multiSearchData) {
              const queryParts = result.button.query.split('\n');
              const stats = {
                index: result.button.targetIndexPatternId,
                type: result.button.targetIndexPatternType,
                meta: {
                  label: result.button.label
                },
                response: meta ? meta : error,
                query: JSON.parse(queryParts[1])
              };
              if (meta && isJoinPruned(meta)) {
                stats.pruned = true;
              }
              $scope.multiSearchData.add(stats);
            }
          }
        });
      }
    });
    kibiMeta.getMetaForRelationalButtons(metaDefinitions);
  };

  // Update the counts on each button of the related filter
  const _addButtonQuery = function (buttons, dashboardId, updateOnClick = false) {
    if ($scope.multiSearchData) {
      $scope.multiSearchData.clear();
    }
    const indexPatternButtons = _.filter(buttons, 'type', 'INDEX_PATTERN');
    return Promise.all(_.map(indexPatternButtons, (button) => {
      return Promise.all([
        kibiState.timeBasedIndices(button.targetIndexPatternId, button.targetDashboardId),
        sirenSequentialJoinVisHelper.getJoinSequenceFilter(dashboardId, button)
      ])
      .then(([ indices, joinSeqFilter ]) => {
        button.joinSeqFilter = joinSeqFilter;
        button.disabled = false;
        if ($scope.btnCountsEnabled() || updateOnClick) {
          return sirenSequentialJoinVisHelper.buildCountQuery(button.targetDashboardId, joinSeqFilter)
          .then((query) => {
            button.query = searchHelper.optimize(indices, query, button.targetIndexPatternId);
            return { button, indices };
          });
        } else {
          button.query = null; //set to null to indicate that counts should not be fetched
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
          return sirenSequentialJoinVisHelper.buildCountQuery(button.targetDashboardId)
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
    if (!buttons || !buttons.length) {
      return Promise.resolve([]);
    } else if (edit) {
      return Promise.resolve(buttons);
    }
    const buttonsToUpdate = _.reduce(buttons, (total, button) => {
      if (button.type === 'VIRTUAL_ENTITY') {
        for (const key in button.sub) {
          // update only visible buttons
          if ($scope.visibility.subRelations[key]) {
            if (button.sub.hasOwnProperty(key)) {
              _.each(button.sub[key], (btn) => {
                total.push(btn);
              });
            }
          }
        }
        for (const key in button.altSub) {
          // update only visible buttons
          if ($scope.visibility.altViewDashboards[key]) {
            if (button.altSub.hasOwnProperty(key)) {
              _.each(button.altSub[key], (btn) => {
                total.push(btn);
              });
            }
          }
        }
      } else {
        total.push(button);
      }
      return total;
    }, []);
    delayExecutionHelper.addEventData({
      buttons: buttonsToUpdate,
      dashboardId: dashboardId
    });
    return Promise.resolve(buttons);
  };

  /**
   *  Compose the cardinality query for EID buttons using the current dashboard filters.
   */
  const _getCardinalityQuery = function (button) {
    const currentDashboardId = kibiState.getCurrentDashboardId();
    return kibiState.getState(currentDashboardId).then(({ index, filters, queries, time }) => {

      function omitDeep(obj, omitKey) {
        delete obj[omitKey];

        _.each(obj, function (val, key) {
          if (val && typeof (val) === 'object') {
            obj[key] = omitDeep(val, omitKey);
          }
        });

        return obj;
      }

      // Removes the $state object from filters if present, as it will break the count query.
      const cleanedFilters = omitDeep(filters, '$state');
      const queryDef = queryBuilder(cleanedFilters, queries, time);

      queryDef._source = false;
      queryDef.size = 0;
      queryDef.aggregations = { distinct_field : { cardinality : { field : button.sourceField } } };

      return {
        index: button.sourceIndexPatternId,
        body: queryDef
      };
    });
  };

  const _updateCardinalityCounts = function (buttons) {
    return Promise.reduce(buttons, (buttons, button) => {
      if (button.type === 'VIRTUAL_ENTITY') {
        return _getCardinalityQuery(button)
        .then((cardinalityQuery) => {
          return es.search(cardinalityQuery)
          .then((esResult) => {
            button.targetCount = esResult.aggregations.distinct_field.value;
            buttons.push(button);
            return buttons;
          });
        });
      }
      buttons.push(button);
      return buttons;
    }, []);
  };

  /**
   * Add the alternative menu hierarchy where you use dashboard and then select one of the available relations
   */
  const addAlternativeSubHierarchy = function (buttons) {
    const addAltSubButtons = (subButtons, label, button) => {
      _.each(subButtons, (subButton) => {
        const altSubButton = _.clone(subButton);
        altSubButton.label = label;

        if (!button.altSub[subButton.label]) {
          button.altSub[subButton.label] = [];
        }
        if ($scope.btnCountsEnabled()) {
          altSubButton.showSpinner = true;
        }

        button.altSub[subButton.label].push(altSubButton);
      });
    };

    _.each(buttons, (button) => {
      if (button.type === 'VIRTUAL_ENTITY') {
        button.altSub = {};
        const subButtons = button.sub;
        if (subButtons) {
          for (const key in subButtons) {
            if (subButtons.hasOwnProperty(key)) {
              addAltSubButtons(subButtons[key], key, button);
            }
          }
        }
      }
    });
  };

  const _getButtons = function (relations, entities, compatibleSavedSearchesMap, compatibleDashboardsMap) {
    const buttons = [];
    _.each(relations, rel => {
      if (rel.domain.type === 'INDEX_PATTERN') {
        const button = {
          type: rel.range.type,
          indexRelationId: rel.id,
          domainIndexPattern: rel.domain.id,
          sourceDashboardId: null,
          targetDashboardId: null,
          status: 'default'
        };

        if (button.type === 'VIRTUAL_ENTITY') {
          const virtualEntity = _.find(entities, 'id', rel.range.id);
          button.id = rel.id + '-ve-' + rel.range.id;
          button.label = rel.directLabel + ' ({0} ' + virtualEntity.label + ')';
          buttons.push(button);
        } else if (button.type === 'INDEX_PATTERN') {
          const compatibleSavedSearches = compatibleSavedSearchesMap[rel.range.id];
          _.each(compatibleSavedSearches, compatibleSavedSearch => {
            const compatibleDashboards = compatibleDashboardsMap[compatibleSavedSearch.id];
            _.each(compatibleDashboards, compatibleDashboard => {
              const clonedButton = _.clone(button);
              clonedButton.targetDashboardId = compatibleDashboard.id;
              clonedButton.id = rel.id + '-ip-' + compatibleDashboard.title;
              clonedButton.label = rel.directLabel + ' ({0} ' + compatibleDashboard.title + ')';
              buttons.push(clonedButton);
            });
          });
        }
      }
    });

    return buttons;
  };


  const constructButtons = $scope.constructButtons = function (indexPatternId) {
    return Promise.all([
      ontologyClient.getRelations(),
      savedDashboards.find(),
      savedSearches.find(),
      ontologyClient.getEntities()
    ]).then(res => {
      const relations = res[0];
      const savedDashboards = res[1].hits;
      const savedSearches = res[2].hits;
      const entities = res[3];

      // build maps once to avoid doing the lookups inside the loop
      const compatibleSavedSearchesMap = {};
      const compatibleDashboardsMap = {};

      _.each(savedSearches, savedSearch => {
        const searchSource = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
        if (!compatibleSavedSearchesMap[searchSource.index]) {
          compatibleSavedSearchesMap[searchSource.index] = [];
        }
        compatibleSavedSearchesMap[searchSource.index].push(savedSearch);
      });

      _.each(savedDashboards, savedDashboard => {
        if (!compatibleDashboardsMap[savedDashboard.savedSearchId]) {
          compatibleDashboardsMap[savedDashboard.savedSearchId] = [];
        }
        compatibleDashboardsMap[savedDashboard.savedSearchId].push(savedDashboard);
      });

      const newButtons = _getButtons(relations, entities, compatibleSavedSearchesMap, compatibleDashboardsMap);

      const buttonDefs = _.filter(
        newButtons,
        btn => relationsHelper.validateRelationIdWithRelations(btn.indexRelationId, relations)
      );

      const difference = newButtons.length - buttonDefs.length;
      if (!edit && difference === 1) {
        notify.warning(difference + ' button refers to a non existing relation');
      } else if (!edit && difference > 1) {
        notify.warning(difference + ' buttons refer to a non existing relation');
      }

      if (!edit) {
        const dashboardIds = [ currentDashboardId ];
        _.each(buttonDefs, button => {
          if (!_.contains(dashboardIds, button.targetDashboardId)) {
            dashboardIds.push(button.targetDashboardId);
          }
        });

        return kibiState._getDashboardAndSavedSearchMetas(dashboardIds, false)
        .then(metas => {
          return {
            metas,
            buttonDefs
          };
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

          const buttons = sirenSequentialJoinVisHelper.constructButtonsArray(
            buttonDefs,
            relations,
            currentDashboardIndex,
            currentDashboardId,
            dashboardIdIndexPair
          );

          for (let i = 0; i < buttons.length; i++) {
            // disable buttons until buttons are ready
            buttons[i].disabled = true;
            // retain the buttons order
            buttons[i].btnIndex = i;
          }
          if (!buttons.length) {
            $scope.vis.error =
              `The relational filter visualization "${$scope.vis.title}" is not configured for this dashboard. ` +
              `No button has a source index matching the current dashboard index: ${currentDashboardIndex}.`;
          }

          // populate subButtons for EID buttons and add spinner flag
          _.each(buttons, (button) => {
            if (button.type === 'VIRTUAL_ENTITY') {
              const relationsByDomain = _.filter(relations, rel => rel.domain.id === button.targetIndexPatternId);

              button.sub = {};
              button.hasSub = false;

              _.each(relationsByDomain, relByDomain => {
                if (relByDomain.range.id !== button.sourceIndexPatternId) {
                  // filter the savedSearch with the same indexPattern
                  const compatibleSavedSearches = compatibleSavedSearchesMap[relByDomain.range.id];
                  _.each(compatibleSavedSearches, compatibleSavedSearch => {
                    const compatibleDashboards = compatibleDashboardsMap[compatibleSavedSearch.id];
                    _.each(compatibleDashboards, compatibleDashboard => {
                      const subButton = sirenSequentialJoinVisHelper.constructSubButton(
                        button,
                        compatibleDashboard,
                        relByDomain
                      );
                      sirenSequentialJoinVisHelper.addClickHandlerToButton(subButton);

                      const key = relByDomain.directLabel;
                      if (!button.sub[key]) {
                        button.sub[key] = [];
                      }
                      if ($scope.btnCountsEnabled()) {
                        subButton.showSpinner = true;
                      }
                      button.hasSub = true;
                      button.sub[key].push(subButton);
                    });
                  });
                }
              });

            } else {
              if ($scope.btnCountsEnabled()) {
                button.showSpinner = true;
              }
            }
          });

          addAlternativeSubHierarchy(buttons);
          return buttons;
        })
        .catch(notify.error);
      } else {
        const unFilteredButtons = sirenSequentialJoinVisHelper.constructButtonsArray(buttonDefs, relations);
        const filteredButtons = _.filter(unFilteredButtons, button => button.domainIndexPattern === indexPatternId);
        return filteredButtons;
      }
    });
  };

  /*
   * Update counts in reaction to events.
   * Filter buttons by indexPatternId === domainIndexPattern (used in edit mode)
   */
  const updateButtons = function (reason, indexPatternId) {
    if (!kibiState.isSirenJoinPluginInstalled()) {
      notify.error(
        'This version of Siren Relational filter requires the Federate plugin for Elasticsearch. '
        + 'Please install it and restart Siren Investigate.'
      );
      return;
    }

    if (console) {
      console.log(`Updating counts on the relational buttons because: ${reason}`);
    }
    const self = this;

    let promise;
    if (!$scope.buttons || !$scope.buttons.length || edit) {
      promise = constructButtons.call(self, indexPatternId);
    } else {
      promise = Promise.resolve($scope.buttons);
    }
    promise
    .then((buttons) => _updateCardinalityCounts.call(self, buttons))
    .then((buttons) => _collectUpdateCountsRequest.call(self, buttons, currentDashboardId))
    .then((buttons) => {
      // http://stackoverflow.com/questions/20481327/data-is-not-getting-updated-in-the-view-after-promise-is-resolved
      // assign data to $scope.buttons once the promises are done
      const updateSourceCount = function (currentDashboardId, relationId) {
        const virtualButton = {
          id: 'virtual-button' + this.sourceIndexPatternId + this.targetIndexPatternId + this.sourceField + this.targetField,
          sourceField: this.targetField,
          sourceIndexPatternId: this.targetIndexPatternId,
          targetField: this.sourceField,
          targetIndexPatternId: this.sourceIndexPatternId,
          targetDashboardId: currentDashboardId,
          indexRelationId: relationId,
          type: 'INDEX_PATTERN'
        };

        return _addButtonQuery.call(self, [ virtualButton ], this.targetDashboardId)
        .then(results => {
          updateCounts(results, $scope);
          return results;
        })
        .catch(notify.error);
      };

      if (edit) {
        $scope.buttons = buttons;
      } else {
        $scope.buttons = new Array(buttons.length);
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i];
          if (button.type === 'INDEX_PATTERN') {
            button.updateSourceCount = updateSourceCount;
          } else {
            if (button.sub) {
              for (const key in button.sub) {
                if (button.sub.hasOwnProperty(key)) {
                  _.each(button.sub[key], (subButton) => {
                    subButton.updateSourceCount = updateSourceCount;
                  });
                }
              }
            }
            if (button.altSub) {
              for (const key in button.altSub) {
                if (button.altSub.hasOwnProperty(key)) {
                  _.each(button.altSub[key], (subButton) => {
                    subButton.updateSourceCount = updateSourceCount;
                  });
                }
              }
            }
          }
          // Returns the count of documents involved in the join
          $scope.buttons[button.btnIndex] = button;
        }
      }
    })
    .catch(notify.error);
  };

  /**
   *  Returns the list of the currently visible virtual entity sub buttons.
   */
  const getVisibleVirtualEntitySubButtons = function (visibility) {
    let returnButtons = [];

    if ($scope.vis.params.layout === 'normal') {
      const visibleRelations = new Set();
      for (const prop in visibility.subRelations) {
        if (visibility.subRelations.hasOwnProperty(prop)) {
          if (visibility.subRelations[prop] === true) {
            visibleRelations.add(prop);
          }
        }
      }
      const visibleDashboards = new Set();
      for (const prop in visibility.altViewDashboards) {
        if (visibility.altViewDashboards.hasOwnProperty(prop)) {
          if (visibility.altViewDashboards[prop] === true) {
            visibleDashboards.add(prop);
          }
        }
      }
      // gathering buttons that have to be computed
      returnButtons = _.reduce($scope.buttons, (acc, button) => {
        if (button.type === 'VIRTUAL_ENTITY') {
          _.each(button.sub, (subButtons, rel) => {
            if (visibleRelations.has(rel)) {
              _.each(subButtons, (subButton) => {
                delete subButton.targetCount;
                if (!subButton.joinExecuted) {
                  acc.push(subButton);
                }
              });
            }
          });
          _.each(button.altSub, (subButtons, dashboardName) => {
            if (visibleDashboards.has(dashboardName)) {
              _.each(subButtons, (subButton) => {
                delete subButton.targetCount;
                if (!subButton.joinExecuted) {
                  acc.push(subButton);
                }
              });
            }
          });
        }
        return acc;
      }, []);
    } else if ($scope.vis.params.layout === 'light') {
      const visibleButtons = new Set();
      for (const prop in visibility.buttons) {
        if (visibility.buttons.hasOwnProperty(prop)) {
          if (visibility.buttons[prop] === true) {
            visibleButtons.add(prop);
          }
        }
      }

      // gathering buttons that have to be computed
      returnButtons = _.reduce($scope.buttons, (acc, button) => {
        if (button.type === 'VIRTUAL_ENTITY' && visibleButtons.has(button.id)) {
          for (const prop in button.sub) {
            if (button.sub.hasOwnProperty(prop)) {
              acc.push.apply(acc, button.sub[prop]);
            }
          }
        }
        return acc;
      }, []);
    }

    return returnButtons;
  };

  /**
   *  Computes the counts for buttons in VIRTUAL_ENTITY buttons sub menu.
   *  It used the passed visibility to compute only the currently shown.
   */
  const computeVisibleVirtualEntitySubButtonsCount = function (visibility) {
    if (visibility) {
      const buttons = getVisibleVirtualEntitySubButtons(visibility);

      _addButtonQuery(buttons, currentDashboardId)
      .then(results => {
        updateCounts(results, $scope);
      });
    }
  };

  $scope.getCurrentDashboardBtnCounts = function () {
    const virtualEntityButtons = getVisibleVirtualEntitySubButtons($scope.visibility);
    const allButtons = $scope.buttons.concat(virtualEntityButtons);
    _addButtonQuery(allButtons, currentDashboardId, true) // TODO take care about this true parameter
    .then(results => {
      updateCounts(results, $scope);
    });
  };

  const sirenDashboardChangedOff = $rootScope.$on('kibi:dashboard:changed', updateButtons.bind(this, 'kibi:dashboard:changed'));
  let editFilterButtonsOff;
  if (edit) {
    editFilterButtonsOff = $rootScope.$on('siren:auto-join-params:filter:indexpattern', (event, indexPatternId) => {
      updateButtons('siren:auto-join-params:filter:indexpattern', indexPatternId);
    });
  }

  $scope.$listen(kibiState, 'save_with_changes', function (diff) {
    if (diff.indexOf(kibiState._properties.dashboards) !== -1) {
      updateButtons.call(this, 'dashboards in kibistate changes');
    }
  });

  $scope.$listen(appState, 'save_with_changes', function (diff) {
    if (diff.indexOf('query') === -1) {
      return;
    }
    updateButtons.call(this, 'AppState changes');
  });

  $scope.$listen(queryFilter, 'update', function () {
    updateButtons.call(this, 'filters change');
  });

  $scope.$listen(globalState, 'save_with_changes', function (diff) {
    const currentDashboard = kibiState.getDashboardOnView();
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

  $scope.$watch('visibility', (newVal, oldVal) => {
    if (newVal && !_.isEqual(newVal, oldVal)) {
      computeVisibleVirtualEntitySubButtonsCount(newVal);
    }
  }, true);

  // when autoupdate is on we detect the refresh here
  const removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', (event) => {
    if ((timefilter.refreshInterval.display !== 'Off')
        && (timefilter.refreshInterval.pause === false)) {
      const currentDashboard = kibiState.getDashboardOnView();
      if (!currentDashboard) {
        return;
      }

      updateButtons('courier:searchRefresh');
    }
  });

  $scope.$on('$destroy', function () {
    delayExecutionHelper.cancel();
    sirenDashboardChangedOff();
    removeAutorefreshHandler();
    if (editFilterButtonsOff) {
      editFilterButtonsOff();
    }
    kibiMeta.flushRelationalButtonsFromQueue();
  });

  $scope.hoverIn = function (button) {
    dashboardGroups.setGroupHighlight(button.targetDashboardId);
  };

  $scope.hoverOut = function () {
    dashboardGroups.resetGroupHighlight();
  };

  // init if not in edit mode
  // in edit mode an event will be filred from the configuration panel to init buttons.
  if (!edit) {
    updateButtons('init');
  }
};

uiModules
.get('kibana/siren_auto_join_vis', ['kibana'])
.controller('SirenAutoJoinVisController', controller);
