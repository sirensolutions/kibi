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
import { SirenAutoJoinHelperProvider } from './siren_auto_join_helper';
import isJoinPruned from 'ui/kibi/helpers/is_join_pruned';
import treeHelper from './tree_helper';

function controller($scope, $rootScope, Private, kbnIndex, config, kibiState, getAppState, globalState, createNotifier,
  savedDashboards, savedSearches, dashboardGroups, kibiMeta, timefilter, es, ontologyClient) {
  const DelayExecutionHelper = Private(DelayExecutionHelperFactory);
  const searchHelper = new SearchHelper(kbnIndex);
  const edit = onVisualizePage();
  const sirenAutoJoinHelper = Private(SirenAutoJoinHelperProvider);

  const notify = createNotifier({
    location: 'Siren Automatic Relational filter'
  });
  const appState = getAppState();

  const relationsHelper = Private(RelationsHelperFactory);
  const sirenSequentialJoinVisHelper = Private(KibiSequentialJoinVisHelperFactory);
  const currentDashboardId = kibiState.getCurrentDashboardId();
  $scope.currentDashboardId = currentDashboardId;
  const queryFilter = Private(FilterBarQueryFilterProvider);


  $scope.getButtonLabel = function (button, addApproximate) {
    let count = button.targetCount !== undefined ? button.targetCount : '?';
    if (addApproximate && button.targetCount !== undefined) {
      count = '~' + count;
    }
    return button.label.replace('{0}', count);
  };

  $scope.btnCountsEnabled = function () {
    return config.get('siren:enableAllRelBtnCounts');
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
              scope.multiSearchData.add(stats);
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

    // to avoid making too many unnecessary http calls to
    //
    // 1 get dashboards metadata
    // 2 fetch field_stats while getting timeBasedIndices
    //
    // lets first collect all source and target dashboard ids from all buttons
    // and all indexPattern + dashboardIds
    // and fetch all required things before computing button queries
    const indexPatternButtons = [];
    const dashboardIds = [dashboardId];
    const timeBasedIndicesList = [];
    _.each(buttons, button => {
      if (button.type === 'INDEX_PATTERN') {
        indexPatternButtons.push(button);

        // compute the target dashboard ids
        if (button.targetDashboardId && dashboardIds.indexOf(button.targetDashboardId) === -1) {
          dashboardIds.push(button.targetDashboardId);
        }

        // compute the target indexpattern + target dashboard map
        const sourceIndicesFound = _.find(timeBasedIndicesList, item => {
          return item.indexPatternId === button.sourceIndexPatternId &&
                 item.dashboardIds &&
                 item.dashboardIds.length === 1 &&
                 item.dashboardIds[0] === dashboardId;
        });
        if (!sourceIndicesFound) {
          timeBasedIndicesList.push({
            indexPatternId: button.sourceIndexPatternId,
            dashboardIds: [ dashboardId ]
          });
        }
        const targetIndicesFound = _.find(timeBasedIndicesList, item => {
          return item.indexPatternId === button.targetIndexPatternId &&
                 item.dashboardIds &&
                 item.dashboardIds.length === 1 &&
                 item.dashboardIds[0] === button.targetDashboardId;
        });
        if (!targetIndicesFound) {
          timeBasedIndicesList.push({
            indexPatternId: button.targetIndexPatternId,
            dashboardIds: [ button.targetDashboardId ]
          });
        }
      }
    });

    const dashboardStatesPromise = kibiState.getStates(dashboardIds);
    const timeBasedIndicesListPromise = kibiState.timeBasedIndicesMap(timeBasedIndicesList);

    return Promise.all([ dashboardStatesPromise, timeBasedIndicesListPromise ])
    .then(res => {
      const dashboardStates = res[0];
      const timeBasedIndicesOutputList = res[1];

      return Promise.all(_.map(indexPatternButtons, (button) => {

        const sourceIndicesItem = _.find(timeBasedIndicesOutputList, item => {
          return item.indexPatternId === button.sourceIndexPatternId &&
          item.dashboardIds[0] === dashboardId;
        });
        const sourceIndices = sourceIndicesItem.timeBasedIndices;

        const targetIndicesItem = _.find(timeBasedIndicesOutputList, item => {
          return item.indexPatternId === button.targetIndexPatternId &&
          item.dashboardIds[0] === button.targetDashboardId;
        });
        const targetIndices = targetIndicesItem.timeBasedIndices;

        return sirenSequentialJoinVisHelper.getJoinSequenceFilter(
          dashboardStates[dashboardId],
          sourceIndices,
          targetIndices,
          button
        )
        .then(joinSeqFilter => {
          button.joinSeqFilter = joinSeqFilter;
          button.disabled = false;
          if ($scope.btnCountsEnabled() || updateOnClick) {
            const query = sirenSequentialJoinVisHelper.buildCountQuery(dashboardStates[button.targetDashboardId], joinSeqFilter);
            button.query = searchHelper.optimize(targetIndices, query, button.targetIndexPatternId);
          } else {
            button.query = null; //set to null to indicate that counts should not be fetched
          }
          return { button, indices: targetIndices };
        })
        .catch((error) => {
          // If computing the indices failed because of an authorization error
          // set indices to an empty array and mark the button as forbidden.
          if (error instanceof IndexPatternAuthorizationError) {
            button.forbidden = true;
            button.disabled = true;
          }
          if ($scope.btnCountsEnabled() || updateOnClick) {
            const query = sirenSequentialJoinVisHelper.buildCountQuery(dashboardStates[button.targetDashboardId]);
            button.query = searchHelper.optimize([], query, button.targetIndexPatternId);
          }
          return { button, indices: [] };
        });
      }));

    }).catch(notify.error);
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


  const _getButtons = function (relations, entities, compatibleSavedSearchesMap, compatibleDashboardsMap, visibility) {
    console.log('visibility');
    console.log(visibility);
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
          const id = rel.id + '-ve-' + rel.range.id;
            if (!visibility[id] || !visibility[id].button === false) {
            const virtualEntity = _.find(entities, 'id', rel.range.id);
            button.id = id;
            button.label = rel.directLabel + ' ({0} ' + virtualEntity.label + ')';
            buttons.push(button);
          }
        } else if (button.type === 'INDEX_PATTERN') {
          const compatibleSavedSearches = compatibleSavedSearchesMap[rel.range.id];
          _.each(compatibleSavedSearches, compatibleSavedSearch => {
            const compatibleDashboards = compatibleDashboardsMap[compatibleSavedSearch.id];
            _.each(compatibleDashboards, compatibleDashboard => {
              const id = rel.id + '-ip-' + compatibleDashboard.title;
              if (!visibility[id] || !visibility[id].button === false) {
                const clonedButton = _.clone(button);
                clonedButton.targetDashboardId = compatibleDashboard.id;
                clonedButton.id = id;
                clonedButton.label = rel.directLabel + ' ({0} ' + compatibleDashboard.title + ')';
                buttons.push(clonedButton);
              }
            });
          });
        }
      }
    });

    return buttons;
  };

  const _createCompatibleSavedSearchesMap = function (savedSearches) {
    const compatibleSavedSearchesMap = {};
    _.each(savedSearches, savedSearch => {
      const searchSource = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
      if (!compatibleSavedSearchesMap[searchSource.index]) {
        compatibleSavedSearchesMap[searchSource.index] = [];
      }
      compatibleSavedSearchesMap[searchSource.index].push(savedSearch);
    });
    return compatibleSavedSearchesMap;
  };

  const _createCompatibleDashboardsMap = function (savedDashboards) {
    const compatibleDashboardsMap = {};
    _.each(savedDashboards, savedDashboard => {
      if (!compatibleDashboardsMap[savedDashboard.savedSearchId]) {
        compatibleDashboardsMap[savedDashboard.savedSearchId] = [];
      }
      compatibleDashboardsMap[savedDashboard.savedSearchId].push(savedDashboard);
    });
    return compatibleDashboardsMap;
  };


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

    return _addButtonQuery.call(this, [ virtualButton ], this.targetDashboardId)
    .then(results => {
      updateCounts(results, $scope);
      return results;
    })
    .catch(notify.error);
  };



  $scope.toggleNode = function (node) {
    if (node.showChildren === false) {
      // open children of these node
      node.showChildren = !node.showChildren;
      // close other opened siblings
      node.closeOpenSiblings();
    } else {
      node.showChildren = !node.showChildren;
    }
    // here grab visible buttons and request count update

    const buttons = sirenAutoJoinHelper.getVisibleVirtualEntitySubButtons($scope.tree, $scope.vis.params.layout);

    _addButtonQuery(buttons, currentDashboardId)
    .then(results => {
      updateCounts(results, $scope);
    });
  };

  // As buttons are shown on UI side as a tree
  // we compute a tree like structure where some nodes can be of following type
  // BUTTON
  // VIRTUAL_BUTTON
  // RELATION
  // DASHBOARD
  // Because the VIRTUAL_BUTTON children can be arranged for two ways
  // relation first OR dashboards first
  // each VIRTUAL_BUTTON tree node contain two properties
  // nodes AND alt_nodes
  // such structure will help to render and control the UI
  //
  // Exemple structure:
  //
  // {
  //   type: BUTTON
  //   id: 1,
  //   label: button 1
  //   showChildren: false
  //   useAltNodes: false
  //   button: {}
  // },
  // ...
  // for 'normal' layout
  // {
  //   type: VIRTUAL_BUTTON
  //   id: 2,
  //   label: virt button 1
  //   showChildren: true
  //   useAltNodes: false   // START from here try to use this property to render the alternative nodes subtree
  //   nodes: [
  //     {
  //       type: RELATION
  //       id: 3
  //       label: rel 1
  //       showChildren: false
  //       useAltNodes: false
  //       nodes: [
  //         // here all nodes are BUTTONS
  //      ]
  //     },
  //     ...
  //   ],
  //   altNodes: [
  //     {
  //       type: DASHBOARD
  //       id: 3
  //       label: dash 1
  //       showChildren: false
  //       useAltNodes: false
  //       nodes: [
  //         // here all nodes are BUTTONS
  //      ]
  //     },
  //     ...
  //   ]
  // }
  //

  // for 'light' layout
  // {
  //   type: VIRTUAL_BUTTON
  //   id: 2,
  //   label: virt button 1
  //   showChildren: true
  //   useAltNodes: false   // <-- there will be NO altNodes
  //   nodes: [
  //     {
  //       type: BUTTON
  //       id: 3
  //       label: rel 1 dash 1 // <-- HERE we skip one level and generate the buttons directly
  //       showChildren: false
  //       useAltNodes: false
  //       button: button
  //       nodes: [] <-- HERE no nodes
  //
  //     },
  //     ...
  //   ],
  //   altNodes: [] // <-- NO altNodes
  // }


  const constructTree = $scope.constructTree = function (indexPatternId) {
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
      const compatibleSavedSearchesMap = _createCompatibleSavedSearchesMap(savedSearches);
      const compatibleDashboardsMap = _createCompatibleDashboardsMap(savedDashboards);
      const newButtons = _getButtons(
        relations,
        entities,
        compatibleSavedSearchesMap,
        compatibleDashboardsMap,
        $scope.vis.params.visibility);

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

          const tree = sirenAutoJoinHelper.createFirstLevelNodes(buttons);
          if ($scope.vis.params.layout === 'normal') {
            sirenAutoJoinHelper.addNodesToTreeNormalLayout(
              tree, relations,
              compatibleSavedSearchesMap, compatibleDashboardsMap,
              $scope.btnCountsEnabled(),
              $scope.vis.params.visibility
            );
            treeHelper.addAlternativeNodesToTree(tree, $scope.btnCountsEnabled());
          } else if ($scope.vis.params.layout === 'light') {
            sirenAutoJoinHelper.addNodesToTreeLightLayout(
              tree, relations,
              compatibleSavedSearchesMap, compatibleDashboardsMap,
              $scope.btnCountsEnabled()
            );
          }

          $scope.tree = tree;
          return tree;
        })
        .catch(notify.error);
      } else {
        const unFilteredButtons = sirenSequentialJoinVisHelper.constructButtonsArray(buttonDefs, relations);
        const filteredButtons = _.filter(unFilteredButtons, button => button.domainIndexPattern === indexPatternId);

        const tree = sirenAutoJoinHelper.createFirstLevelNodes(filteredButtons);
        $scope.tree = tree;
        return tree;
      }
    });
  };

  /*
   * Update counts in reaction to events.
   * Filter buttons by indexPatternId === domainIndexPattern (used in edit mode)
   *
   * As buttons are now shown as a tree we compute a tree of elelments
   */
  const updateButtons = function (reason, indexPatternId) {
    if (!kibiState.isSirenJoinPluginInstalled()) {
      notify.error(
        'This version of Siren Relational filter requires the Federate plugin for Elasticsearch. '
        + 'Please install it and restart Siren Investigate.'
      );
      return;
    }

    savedDashboards.get(currentDashboardId).then(currentDashboard => {
      if (!currentDashboard.savedSearchId && !$scope.vis.error) {
        $scope.vis.error = 'This component only works on dashboards which have a saved search set.';
        return;
      }

      if (console) {
        console.log(`Updating counts on the relational buttons because: ${reason}`);
      }
      const self = this;

      let promise;
      if (!$scope.tree || !$scope.tree.nodes.length || edit) {
        promise = constructTree.call(self, indexPatternId);
      } else {
        promise = Promise.resolve($scope.tree);
      }

      return promise
      .then(tree => sirenAutoJoinHelper.updateTreeCardinalityCounts(tree))
      .then(tree => {
        if (!tree || !tree.nodes.length) {
          return Promise.resolve({});
        } else if (edit) {
          return Promise.resolve(tree);
        }
        const buttonsToUpdate = sirenAutoJoinHelper.getAllVisibleButtons(tree, $scope.vis.params.layout);
        delayExecutionHelper.addEventData({
          buttons: buttonsToUpdate,
          dashboardId: currentDashboardId
        });
        return tree;
      })
      .then(tree => sirenAutoJoinHelper.addTreeSourceCounts(tree, updateSourceCount))
      .then(tree => $scope.tree = tree);
    })
    .catch(notify.error);
  };

  $scope.getCurrentDashboardBtnCounts = function () {
    const virtualEntityButtons = sirenAutoJoinHelper.getVisibleVirtualEntitySubButtons($scope.tree, $scope.vis.params.layout);
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
.get('kibana/siren_auto_join_vis', ['kibana', 'ui.tree'])
.controller('SirenAutoJoinVisController', controller);

