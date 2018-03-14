import _ from 'lodash';
import Node from './node';
import TreeType from './tree_type';
import { KibiSequentialJoinVisHelperFactory } from 'ui/kibi/helpers/kibi_sequential_join_vis_helper';
import { QueryBuilderFactory } from 'ui/kibi/helpers/query_builder';

export function SirenAutoJoinHelperProvider(Private, Promise, es, kibiState) {

  const sirenSequentialJoinVisHelper = Private(KibiSequentialJoinVisHelperFactory);
  const queryBuilder = Private(QueryBuilderFactory);

  class SirenAutoJoinHelper {

    getVisibleVirtualEntitySubButtons(tree, layout) {

      const visibleVirtualButtons = [];

      _.each(tree.nodes, node => {
        if (node.type === TreeType.VIRTUAL_BUTTON) {
          // if normal layout
          if (layout === 'normal') {
            _.each(node.nodes, relNode => {
              if (relNode.visible) {
                _.each(relNode.nodes, buttonNode => {
                  if (buttonNode.visible) {
                    visibleVirtualButtons.push(buttonNode.button);
                  }
                });
              }
            });
            _.each(node.altNodes, dashNode => {
              if (dashNode.visible) {
                _.each(dashNode.nodes, buttonNode => {
                  if (buttonNode.visible) {
                    visibleVirtualButtons.push(buttonNode.button);
                  }
                });
              }
            });
          } else if (layout === 'light') {
            _.each(node.nodes, dashRelNode => {
              if (dashRelNode.visible) {
                visibleVirtualButtons.push(dashRelNode.button);
              }
            });
          }
        }
      });

      return visibleVirtualButtons;
    }

    createFirstLevelNodes(buttons) {
      const tree = new Node({
        id: 'root',
        showChildren: true,
        parent: null
      });

      _.each(buttons, button => {
        const node = new Node({
          type: button.type === 'INDEX_PATTERN' ? TreeType.BUTTON : TreeType.VIRTUAL_BUTTON,
          id: button.id,
          label: button.label,
          showChildren: false,
          visible: true,
          useAltNodes: false,
          button: button
        });
        tree.addNode(node);
      });

      tree.nodes.sort(function (a, b) {
        if (a.type === TreeType.BUTTON && b.type === TreeType.VIRTUAL_BUTTON) {
          return -1;
        } else if (b.type === TreeType.BUTTON && a.type === TreeType.VIRTUAL_BUTTON) {
          return 1;
        }
        return 0;
      });

      return tree;
    }

    _constructSubButton(parentButton, dashboard, relation, label) {
      return {
        id: relation.id + '-ip-' + dashboard.title,
        indexRelationId: parentButton.indexRelationId,
        label: label,
        sourceDashboardId: parentButton.sourceDashboardId,
        sourceField: parentButton.sourceField,
        sourceIndexPatternId: parentButton.sourceIndexPatternId,
        targetDashboardId: dashboard.id,
        targetField: relation.range.field,
        targetIndexPatternId: relation.range.id,
        type: 'INDEX_PATTERN'
      };
    };

    addNodesToTreeLightLayout(tree, relations, compatibleSavedSearchesMap, compatibleDashboardsMap, btnCountEnabled) {
      _.each(tree.nodes, node => {
        if (node.type === TreeType.VIRTUAL_BUTTON) {
          const relationsByDomain = _.filter(relations, rel => rel.domain.id === node.button.targetIndexPatternId);
          _.each(relationsByDomain, relByDomain => {
            if (relByDomain.range.id !== node.button.sourceIndexPatternId) {
              // filter the savedSearch with the same indexPattern
              const compatibleSavedSearches = compatibleSavedSearchesMap[relByDomain.range.id];
              _.each(compatibleSavedSearches, compatibleSavedSearch => {
                const compatibleDashboards = compatibleDashboardsMap[compatibleSavedSearch.id];
                _.each(compatibleDashboards, compatibleDashboard => {
                  const subButton = this._constructSubButton(
                    node.button,
                    compatibleDashboard,
                    relByDomain,
                    relByDomain.directLabel + ' ' + compatibleDashboard.title + ' {0}'
                  );
                  sirenSequentialJoinVisHelper.addClickHandlerToButton(subButton);
                  if (btnCountEnabled) {
                    subButton.showSpinner = true;
                  }

                  const buttonNode = new Node({
                    type: TreeType.BUTTON,
                    id: subButton.id,
                    visible: false,
                    showChildren: false,
                    useAltNodes: false,
                    button: subButton
                  });

                  node.addNode(buttonNode);
                });
              });
            }
          });
        } else {
          if (btnCountEnabled) {
            node.button.showSpinner = true;
          }
        }
      });
    }

    addNodesToTreeNormalLayout(tree, relations, compatibleSavedSearchesMap, compatibleDashboardsMap, btnCountEnabled) {
      _.each(tree.nodes, node => {
        if (node.type === TreeType.VIRTUAL_BUTTON) {
          const relationsByDomain = _.filter(relations, rel => rel.domain.id === node.button.targetIndexPatternId);
          _.each(relationsByDomain, relByDomain => {
            if (relByDomain.range.id !== node.button.sourceIndexPatternId) {
              // filter the savedSearch with the same indexPattern
              const compatibleSavedSearches = compatibleSavedSearchesMap[relByDomain.range.id];
              _.each(compatibleSavedSearches, compatibleSavedSearch => {
                const compatibleDashboards = compatibleDashboardsMap[compatibleSavedSearch.id];
                _.each(compatibleDashboards, compatibleDashboard => {
                  const subButton = this._constructSubButton(
                    node.button,
                    compatibleDashboard,
                    relByDomain,
                    compatibleDashboard.title + ' {0}'
                  );
                  sirenSequentialJoinVisHelper.addClickHandlerToButton(subButton);
                  if (btnCountEnabled) {
                    subButton.showSpinner = true;
                  }
                  const key = relByDomain.directLabel;
                  const relNodeId = 'tree-relation-' + key;

                  let relNode = node.findNode(relNodeId);
                  if (!relNode) {
                    relNode = new Node({
                      type: TreeType.RELATION,
                      id: relNodeId,
                      label: key,
                      showChildren: false,
                      visible: true,
                      useAltNodes: false,
                    });

                    node.addNode(relNode);
                  }

                  const buttonNode = new Node({
                    type: TreeType.BUTTON,
                    id: subButton.id,
                    label: subButton.label,
                    visible: false,
                    showChildren: false,
                    useAltNodes: false,
                    button: subButton
                  });

                  relNode.addNode(buttonNode);
                });
              });
            }
          });
        } else {
          if (btnCountEnabled) {
            node.button.showSpinner = true;
          }
        }
      });
    }


    /**
     *  Compose the cardinality query for EID buttons using the current dashboard filters.
     */
    _getCardinalityQuery(button) {
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

    updateTreeCardinalityCounts(tree) {
      const promises = [];
      _.each(tree.nodes, node => {
        if (node.type === TreeType.VIRTUAL_BUTTON) {
          const p = this._getCardinalityQuery(node.button)
          .then(cardinalityQuery => es.search(cardinalityQuery))
          .then(esResult => node.button.targetCount = esResult.aggregations.distinct_field.value);

          promises.push(p);
        }
      });
      return Promise.all(promises)
      .then(() => tree);
    };


    getButtonsToUpdateCounts(tree) {
      const buttonsToUpdate = [];
      _.each(tree.nodes, node => {
        if (node.type === TreeType.BUTTON) {
          buttonsToUpdate.push(node.button);
        } else if (node.type === TreeType.VIRTUAL_BUTTON) {
          if (node.useAltNodes) {
            _.each(node.altNodes, altNode => {
              _.each(altNode.nodes, buttonNode => {
                buttonsToUpdate.push(buttonNode.button);
              });
            });
          } else {
            _.each(node.nodes, normalNode => {
              _.each(normalNode.nodes, buttonNode => {
                buttonsToUpdate.push(buttonNode.button);
              });
            });
          }
        } else {
          throw 'Wrong type at first level of the tree';
        }
      });
      return buttonsToUpdate;
    };

    addTreeSourceCounts(tree, updateSourceCount) {
      // http://stackoverflow.com/questions/20481327/data-is-not-getting-updated-in-the-view-after-promise-is-resolved
      // assign data to $scope.buttons once the promises are done

      _.each(tree.nodes, node => {
        if (node.type === TreeType.BUTTON) {
          node.button.updateSourceCount = updateSourceCount;
        } else if (node.type === TreeType.VIRTUAL_BUTTON) {
          _.each(node.altNodes, altNode => {
            _.each(altNode.nodes, buttonNode => {
              buttonNode.button.updateSourceCount = updateSourceCount;
            });
          });
          _.each(node.nodes, normalNode => {
            _.each(normalNode.nodes, buttonNode => {
              buttonNode.button.updateSourceCount = updateSourceCount;
            });
          });
        } else {
          throw 'Wrong type at first level of the tree';
        }
      });

      return tree;
    }




  }

  return new SirenAutoJoinHelper();
}
