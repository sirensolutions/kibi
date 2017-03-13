define(function (require) {

  require('ui/kibi/directives/eeg');
  require('plugins/kibana/settings/sections/kibi_relations/styles/relations.less');
  require('ui/kibi/directives/kibi_validate');

  const _ = require('lodash');
  const $ = require('jquery');

  const app = require('ui/modules').get('apps/settings', ['kibana']);

  app.directive('kibiDebounce', function ($timeout) {
    return {
      restrict: 'A',
      require: 'ngModel',
      priority: 99,
      link: function (scope, elm, attr, ngModelCtrl) {
        if (attr.type === 'radio' || attr.type === 'checkbox') return;

        elm.unbind('input');

        let debounce;
        elm.bind('input', function () {
          $timeout.cancel(debounce);
          debounce = $timeout(function () {
            scope.$apply(function () {
              ngModelCtrl.$setViewValue(elm.val());
            });
          }, attr.ngDebounce || 1000);
        });
        elm.bind('blur', function () {
          scope.$apply(function () {
            ngModelCtrl.$setViewValue(elm.val());
          });
        });
      }
    };
  });

  app.directive('kibiStopEnterKeyDown', function () {
    return {
      restrict: 'A',
      link: function (scope, element, attr) {
        element.bind('keydown', function (e) {
          if (e.which === 13) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
      }
    };
  });

  require('ui/routes')
  .when('/settings/relations', {
    template: require('plugins/kibana/settings/sections/kibi_relations/index.html'),
    reloadOnSearch: false
  });

  app.controller('RelationsController',
  function (Promise, es, kibiState, $rootScope, $scope, $timeout, config, Private, $element, kbnUrl, createNotifier,
            kibiEnterpriseEnabled, $window) {
    const notify = createNotifier({
      location: 'Relations Editor'
    });

    const color = Private(require('ui/vislib/components/color/color'));
    const relationsHelper = Private(require('ui/kibi/helpers/relations_helper'));

    $scope.kibiEnterpriseEnabled = kibiEnterpriseEnabled;

    $scope.unique = _.unique;

    // tabs
    $scope.tab = {
      indexRel: true,
      dashboardRel: false
    };

    $scope.getIndicesRelationsLabel = function () {
      if ($scope.relations && $scope.relations.relationsIndices) {
        return _.map($scope.relations.relationsIndices, function (relInd) {
          return {
            label: relInd.label,
            value: relInd.id
          };
        });
      }
      return [];
    };

    $scope.tabClick = function (currentTab) {
      switch (currentTab) {
        case 'index':
          $scope.tab.indexRel = true;
          $scope.tab.dashboardRel = false;
          break;
        case 'dashboard':
          $scope.tab.dashboardRel = true;
          $scope.tab.indexRel = false;
          break;
      }
    };

    // advanced options button
    $scope.edit = function (item, index) {
      const params = {
        service: 'indices' in item ? 'indices' : 'dashboards',
        id: index
      };

      kbnUrl.change('/settings/relations/{{ service }}/{{ id }}', params);
    };

    $scope.relations = config.get('kibi:relations');
    $scope.relationalPanel = config.get('kibi:relationalPanel');

    // track if the configuration has been changed
    $scope.changed = false;
    $scope.$watch('relationalPanel', function (newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.changed = true;
      }
    });

    let indexToDashboardsMap = null;
    const nodeTypes = [];

    /**
     * creates a map index -> dashboards
     *  {
     *    indexId: [dashboardId1, dashboardId2],
     *    ...
     *  }
     */
    $scope.getIndexToDashboardMap = function () {
      const _createMap = function (results) {
        // postprocess the results to create the map
        const indexToDashboardArrayMap = {};
        _.each(results, function ({ savedDash, savedSearchMeta }) {
          if (savedSearchMeta && !indexToDashboardArrayMap[savedSearchMeta.index]) {
            indexToDashboardArrayMap[savedSearchMeta.index] = [savedDash.id];
          } else if (savedSearchMeta && indexToDashboardArrayMap[savedSearchMeta.index].indexOf(savedDash.id) === -1) {
            indexToDashboardArrayMap[savedSearchMeta.index].push(savedDash.id);
          }
        });
        return indexToDashboardArrayMap;
      };

      return kibiState._getDashboardAndSavedSearchMetas(null, true)
      .then(results => _createMap(results));
    };

    /**
     * Filters out the dashboards that are not relevant in the given row
     * The row index should be passed in options as **rowIndex**
     * The selected flag is passed by the kibi-delect directive to indicate that the item is the selected one
     */
    $scope.filterDashboards = function (item, options, selected) {
      if (selected !== undefined && selected === true) {
        return false;
      }

      const relDash = $scope.relations.relationsDashboards[options.rowIndex];

      if (!item || !item.value) {
        // this is the watched value
        return _.pluck($scope.relations.relationsIndices, 'id').concat(relDash).concat(indexToDashboardsMap);
      }
      let remove = true;

      // do not remove if the dashboard is associated with an index
      _.each(indexToDashboardsMap, function (dashboards) {
        if (dashboards.indexOf(item.value) !== -1) {
          remove = false;
          return false;
        }
      });

      // remove if the dashboard is not in the list of dashboards that are directly connected to item.value
      let connectedDashboards;
      if (!!relDash.dashboards[0] && !relDash.dashboards[1]) {
        connectedDashboards = _getConnectedDashboards(relDash.dashboards[0], relDash.relation);
      } else if (!!relDash.dashboards[1] && !relDash.dashboards[0]) {
        connectedDashboards = _getConnectedDashboards(relDash.dashboards[1], relDash.relation);
      } else if (!relDash.dashboards[0] && !relDash.dashboards[1] && !!relDash.relation) {
        // filter based on the selected relation
        connectedDashboards = _getConnectedDashboards(null, relDash.relation);
      } else {
        connectedDashboards = [];
      }

      if (connectedDashboards.length && connectedDashboards.indexOf(item.value) === -1) {
        remove = true;
      }

      if (!!relDash.dashboards[0] && !!relDash.dashboards[1] && !!relDash.relation) {
        remove = true;
      }
      return remove;
    };

    /**
     * Returns the index associated with dashboardId
     */
    function _getIndexForDashboard(dashboardId) {
      let dIndex = '';

      if (!dashboardId) {
        return '';
      }
      _.each(indexToDashboardsMap, function (dashboards, index) {
        if (dashboards.indexOf(dashboardId) !== -1) {
          dIndex = index;
          return false;
        }
      });
      return dIndex;
    }

    /**
     * Returns the list of dashboards that are directly connected to dashboardId
     */
    function _getConnectedDashboards(dashboardId, relDash) {
      const index = _getIndexForDashboard(dashboardId);

      return _($scope.relations.relationsIndices).map(function (relInd) {
        if (!relDash || relDash === relInd.id) {
          let dashboards = [];

          if ((!!relDash && !index) || index === relInd.indices[0].indexPatternId) {
            dashboards = dashboards.concat(indexToDashboardsMap[relInd.indices[1].indexPatternId]);
          }
          if ((!!relDash && !index) || index === relInd.indices[1].indexPatternId) {
            dashboards = dashboards.concat(indexToDashboardsMap[relInd.indices[0].indexPatternId]);
          }
          return dashboards;
        }
      }).flatten().compact().uniq().value();
    }

    /**
     * Filters out the relations that are not relevant in given row
     * The row index should be passed in options as **rowIndex** property
     * The selected flag is passed by the kibi-delect directive to indicate that the item is the selected one
     */
    $scope.filterRelations = function (item, options, selected) {
      if (selected !== undefined && selected === true) {
        return false;
      }
      // for anything about the dashboards relations - we take them from the scope
      const dashboards = $scope.relations.relationsDashboards[options.rowIndex].dashboards;
      let lIndex = '';
      let rIndex = '';

      if (!item || !item.value) {
        return _.pluck($scope.relations.relationsIndices, 'id')
        .concat(..._.pluck($scope.relations.relationsIndices, 'label'))
        .concat(...dashboards)
        .concat(indexToDashboardsMap);
      }
      _.each(indexToDashboardsMap, function (map, index) {
        if (map.indexOf(dashboards[0]) !== -1) {
          lIndex = index;
        }
        if (map.indexOf(dashboards[1]) !== -1) {
          rIndex = index;
        }
        if (lIndex && rIndex) {
          // break the loop
          return false;
        }
      });

      const validRelations = _($scope.relations.relationsIndices).map(function (relInd) {
        if (lIndex && rIndex) {
          if ((lIndex === relInd.indices[0].indexPatternId && rIndex === relInd.indices[1].indexPatternId) ||
              (lIndex === relInd.indices[1].indexPatternId && rIndex === relInd.indices[0].indexPatternId)) {
            return relInd.id;
          }
        } else if (lIndex) {
          if (lIndex === relInd.indices[0].indexPatternId || lIndex === relInd.indices[1].indexPatternId) {
            return relInd.id;
          }
        } else if (rIndex) {
          if (rIndex === relInd.indices[0].indexPatternId || rIndex === relInd.indices[1].indexPatternId) {
            return relInd.id;
          }
        }
      }).compact().value();
      const usedRelations = _($scope.relations.relationsDashboards).map(function (relDash, offset) {
        if (offset !== options.rowIndex && dashboards[0] && dashboards[1]) {
          if ((dashboards[0] === relDash.dashboards[0] && dashboards[1] === relDash.dashboards[1]) ||
              (dashboards[0] === relDash.dashboards[1] && dashboards[1] === relDash.dashboards[0])) {
            return relDash.relation;
          }
        }
      }).compact().value();
      return (Boolean(lIndex) || Boolean(rIndex)) &&
      // remove item if it is not in any valid relation for the indices lIndex and rIndex
      validRelations.indexOf(item.value) === -1 ||
      // remove item if it is already used for the same dashboards
      usedRelations.indexOf(item.value) !== -1;
    };

    function _addClickHandlers(name, options) {
      options.onNodeDragEnd = function () {
        $rootScope.$emit('egg:' + name + 'Graph:run', 'exportGraph');
      };
    }

    /**
     * Update the graph visualization.
     * - name: the name of the graph, indices or dashboards
     * - options: the options for the eeg graph
     * - isRelationReady: function that checks if a relation is complete
     * - onRelationReady: function that is called once isRelationReady returns true. It is called before anything else.
     * - assertions: array of assertions to be applied on a relation. An assertion is an object with two fields:
     *   - a method "isInvalidRelation"" called on a relation. If it returns true the relation is not valid.
     *   - a field message containing the error message
     * - getSourceNode: function that returns the source node object for a given relation
     * - getTargetNode: function that returns the target node object for a given relation
     * - getLink: function that returns the link object connecting the two nodes
     */
    const updateGraph = function ({ name, options, isRelationReady, assertions, onRelationReady,
                                               getSourceNode, getTargetNode, getLink }) {
      const graphProperty = `${name}Graph`;
      const relationsGraphProperty = `relations${_.capitalize(name)}`;
      const serializedGraphProperty = `relations${_.capitalize(name)}Serialized`;

      const firstLoad = !$scope[graphProperty];

      if (firstLoad && $scope.relations[serializedGraphProperty]) {
        // first load of the graph
        $scope[graphProperty] = $scope.relations[serializedGraphProperty];
        _addClickHandlers(name, $scope[graphProperty].options);
        $rootScope.$emit(`egg:${graphProperty}:run`, 'importGraph', $scope[graphProperty]);
        return;
      } else if (!$scope[graphProperty]) {
        $scope[graphProperty] = {
          options: options,
          nodes: [],
          links: []
        };
        _addClickHandlers(name, $scope[graphProperty].options);
      } else {
        $scope[graphProperty] = $scope.relations[serializedGraphProperty];
        _addClickHandlers(name, $scope[graphProperty].options);
      }

      const addNode = function (node) {
        const id = node.id;

        node.id = `eegid-${id}`; // eeg prefix the ID
        const existingNode = _.findWhere($scope[graphProperty].nodes, node);
        if (!existingNode) {
          node.keep = true; // this is to tag the nodes to remove
          node.id = id;
          $scope[graphProperty].nodes.push(node);
        } else {
          existingNode.keep = true; // this is to tag the nodes to remove
        }
      };

      $scope.invalid = false;
      _.each($scope.relations[relationsGraphProperty], function (relation) {
        const errors = [];

        if (isRelationReady(relation)) {
          if (onRelationReady) {
            onRelationReady(relation);
          }

          _.each(assertions, assertion => {
            if (assertion.isInvalidRelation(relation)) {
              errors.push(assertion.message);
            }
          });

          // build the graph visualisation
          const sourceNode = getSourceNode(relation);
          const targetNode = getTargetNode(relation);
          const link = getLink(relation);

          addNode(sourceNode);
          addNode(targetNode);

          const source = link.source;
          const target = link.target;
          link.source = `eegid-${link.source}`;
          link.target = `eegid-${link.target}`;
          const existingLink = _.findWhere($scope[graphProperty].links, link);
          if (!existingLink) {
            link.keep = true; // this is to tag the nodes to remove
            $scope[graphProperty].links.push(link);
          } else {
            existingLink.keep = true; // this is to tag the nodes to remove
          }

          // build types array to build color map
          if (nodeTypes.indexOf(sourceNode.id) === -1) {
            nodeTypes.push(sourceNode.id);
          }
          if (nodeTypes.indexOf(targetNode.id) === -1) {
            nodeTypes.push(targetNode.id);
          }
        }

        relation.errors = errors;
        if (errors.length) {
          $scope.invalid = true;
        }
      });

      $scope.typeToColor = color(nodeTypes);
      _.each(nodeTypes, function (nodeType) {
        $scope[graphProperty].options.colors[nodeType] = $scope.typeToColor(nodeType);
      });

      // remove deleted nodes and links
      $scope[graphProperty].nodes = _($scope[graphProperty].nodes).filter('keep', true).map(n => _.omit(n, 'keep')).value();
      $scope[graphProperty].links = _($scope[graphProperty].links).filter('keep', true).map(l => _.omit(l, 'keep')).value();

      // save the graph layout
      $scope.relations[`relations${_.capitalize(name)}Serialized`] = $scope[graphProperty];
      // draw the graph
      $rootScope.$emit(`egg:${graphProperty}:run`, 'importGraph', $scope[graphProperty]);
    };

    /**
     * Updates the relationships between dashboards
     */
    function _updateRelationsDashboards(oldRelations) {
      const relationId = function (relation) {
        const i0 = relation.dashboards[0];
        const i1 = relation.dashboards[1];
        return relation.relation + (i0 < i1 ? i0 + i1 : i1 + i0);
      };

      const _getRelationLabel = function (relationId) {
        let label;

        _.each($scope.relations.relationsIndices, function (relation) {
          if (relation.id === relationId) {
            label = relation.label;
            return false;
          }
        });
        return label;
      };

      // check for duplicates
      const uniq = _.groupBy($scope.relations.relationsDashboards, function (relation) {
        if (relation.relation) {
          return relationId(relation);
        }
      });

      updateGraph({
        name: 'dashboards',
        options: {
          monitorContainerSize: true,
          alwaysShowLinksLabels: true,
          groupingForce: {},
          nodeIcons: {},
          colors: {}
        },
        isRelationReady: function (relDash) {
          return relDash.relation && relDash.dashboards[0] && relDash.dashboards[1];
        },
        getSourceNode: function (relDash) {
          const sourceNodeIndexId = _getIndexForDashboard(relDash.dashboards[0]);

          return {
            id: relDash.dashboards[0],
            label: relDash.dashboards[0],
            nodeType: sourceNodeIndexId
          };
        },
        getTargetNode: function (relDash) {
          const targetNodeIndexId = _getIndexForDashboard(relDash.dashboards[1]);

          return {
            id: relDash.dashboards[1],
            label: relDash.dashboards[1],
            nodeType: targetNodeIndexId
          };
        },
        getLink: function (relDash) {
          return {
            source: relDash.dashboards[0],
            target: relDash.dashboards[1],
            linkType: _getRelationLabel(relDash.relation),
            data: {
              relation: relDash.relation,
              dashboards: relDash.dashboards
            },
            undirected: true
          };
        },
        assertions: [
          {
            isInvalidRelation: function (relDash) {
              return uniq[relationId(relDash)].length !== 1;
            },
            message: 'These relationships are equivalent, please remove one.'
          }
        ]
      });

      const isEqual = _($scope.relations.relationsDashboards).map(function (relation) {
        return _.omit(relation, [ '$$hashKey', 'errors' ]);
      }).isEqual(oldRelations.dashboards);

      if (!isEqual) {
        $scope.changed = true;
        $scope.isObjectValid();
      }
    }

    // Listen to changes of relations between dashboards
    $scope.$watch(function ($scope) {
      return {
        labelsFromIndices: _.pluck($scope.relations.relationsIndices, 'label'),
        dashboards: _.map($scope.relations.relationsDashboards, function (relation) {
          return _.omit(relation, [ 'errors' ]);
        })
      };
    }, function (newRelations, oldRelations) {
      if (indexToDashboardsMap === null) {
        $scope.getIndexToDashboardMap(null, true).then(function (map) {
          indexToDashboardsMap = map;
          _updateRelationsDashboards(oldRelations);
        }).catch(function (err) {
          notify.error('Problem getting index to dashboard map', err);
        });
      } else {
        _updateRelationsDashboards(oldRelations);
      }
    }, true);

    $scope.updateIndicesGraph = function (oldRelations) {
      // check for duplicates
      const uniq = _.groupBy($scope.relations.relationsIndices, function (relation, offset) {
        const indexa = relation.indices[0];
        const indexb = relation.indices[1];

        if (indexa.indexPatternId && indexa.path && indexb.indexPatternId && indexb.path) {
          return relationsHelper.getJoinIndicesUniqueID(indexa.indexPatternId, indexa.indexPatternType, indexa.path,
                                                        indexb.indexPatternId, indexb.indexPatternType, indexb.path);
        }
        return offset;
      });

      const indexLabel = function (index) {
        let label = index.indexPatternId;

        if (index.indexPatternType) {
          label += '.' + index.indexPatternType;
        }
        return label + '.' + index.path;
      };

      const getRelationId = function (indices) {
        return relationsHelper.getJoinIndicesUniqueID(indices[0].indexPatternId, indices[0].indexPatternType, indices[0].path,
                                                      indices[1].indexPatternId, indices[1].indexPatternType, indices[1].path);
      };

      const checkMappings = [];

      // each node is an index
      updateGraph({
        name: 'indices',
        options: {
          showLegend: false,
          monitorContainerSize: true,
          alwaysShowLinksLabels: true,
          groupingForce: {},
          nodeIcons: {},
          colors: {}
        },
        isRelationReady: function (relation) {
          const indices = relation.indices;
          return indices[0].indexPatternId && indices[0].path && indices[1].indexPatternId && indices[1].path;
        },
        onRelationReady: function (relation) {
          const indices = relation.indices;

          if (!relation.label) {
            relation.label = `${indexLabel(indices[0])} -- ${indexLabel(indices[1])}`;
          }

          relation.id = getRelationId(indices);

          checkMappings.push(Promise.all([
            es.indices.getFieldMapping({
              index: [ indices[0].indexPatternId ],
              type: indices[0].indexPatternType || [],
              field: [ indices[0].path ],
              includeDefaults: true
            }),
            es.indices.getFieldMapping({
              index: [ indices[1].indexPatternId ],
              type: indices[1].indexPatternType || [],
              field: [ indices[1].path ],
              includeDefaults: true
            })
          ])
          .then(([ leftMapping, rightMapping ]) => {
            return { leftMapping, rightMapping, relation };
          }));
        },
        getSourceNode: function (relation) {
          const nodeId = relation.indices[0].indexPatternId;

          return {
            id: nodeId,
            label: nodeId,
            nodeType: nodeId
          };
        },
        getTargetNode: function (relation) {
          const nodeId = relation.indices[1].indexPatternId;

          return {
            id: nodeId,
            label: nodeId,
            nodeType: nodeId
          };
        },
        getLink: function (relation) {
          const sourceNodeId = relation.indices[0].indexPatternId;
          const targetNodeId = relation.indices[1].indexPatternId;

          return {
            source: sourceNodeId,
            target: targetNodeId,
            linkType: relation.label,
            undirected: true
          };
        },
        assertions: [
          {
            isInvalidRelation: function (relation) {
              const indices = relation.indices;
              return uniq[getRelationId(indices)].length !== 1;
            },
            message: 'These relationships are equivalent, please remove one.'
          },
          {
            isInvalidRelation: function (relation) {
              const indices = relation.indices;
              return indices[0].indexPatternId === indices[1].indexPatternId &&
                indices[0].indexPatternType === indices[1].indexPatternType &&
                indices[0].path === indices[1].path;
            },
            message: 'Left and right sides of the relation cannot be the same.'
          }
        ]
      });

      const checkJoinMappings = function () {
        return Promise.all(checkMappings)
        .then(mappings => {
          /**
          * Returns true if the index and type of the leftMapping are equal to those of the rightMapping
          */
          const areMappingsCompatibleForSirenJoin = function (leftMapping, rightMapping) {
            return leftMapping.index === rightMapping.index && leftMapping.type === rightMapping.type;
          };

          /**
          * Checks if all the fields in the indices matching the index pattern have the same mapping.
          * Returns true if this is the case.
          */
          const doAllFieldsHaveTheSameMapping = function (relation, mapping, { indexPatternId, indexPatternType, path }) {
            if (_.size(mapping) === 1) {
              return true;
            }

            const indicesAndMapping = _.map(mapping, (value, indexName) => {
              const type = indexPatternType || Object.keys(value.mappings)[0];
              return {
                index: indexName,
                mapping: _.values(value.mappings[type][path].mapping)[0]
              };
            });

            let compatible = true;
            for (let i = 1; i < indicesAndMapping.length; i++) {
              if (!areMappingsCompatibleForSirenJoin(indicesAndMapping[i - 1].mapping, indicesAndMapping[i].mapping)) {
                compatible = false;
                break;
              }
            }
            if (!compatible) {
              if (!relation.errors) {
                relation.errors = [];
              }
              const msg = _(indicesAndMapping)
              // group the indices having the same index/type mapping together
              .groupBy(({ mapping }) => JSON.stringify(_.pick(mapping, [ 'index', 'type' ]), null, ' '))
              // indicate which indices have a certain index/type mapping
              .map((values, indexAndType) => `<li>on indices ${_.pluck(values, 'index').join(', ')} the mapping is ${indexAndType}</li>`)
              .value()
              .join('');
              relation.errors.push(`The mappings for the field ${path} differ on some indices matching the pattern ${indexPatternId}:<br/>
                                   <ul>
                                   ${msg}
                                   </ul>`);
              $scope.invalid = true;
              return false;
            }
            return true;
          };

          /**
          * Returns the mapping of a field
          */
          const getFieldMapping = function (mapping, { indexPatternType, path }) {
            const index = Object.keys(mapping)[0];
            const type = indexPatternType || Object.keys(mapping[index].mappings)[0];

            if (index && type) {
              return _.values(mapping[index].mappings[type][path].mapping)[0];
            }
          };

          _.each(mappings, ({ leftMapping, rightMapping, relation }) => {
            const indices = relation.indices;

            // check if all field mappings for a given index pattern are the same
            if (!doAllFieldsHaveTheSameMapping(relation, leftMapping, indices[0]) ||
                !doAllFieldsHaveTheSameMapping(relation, rightMapping, indices[1])) {
              // do not check any further since the indices in the current pattern are incompatible already
              return;
            }

            // check if the field joined together are compatible
            const leftFieldMapping = getFieldMapping(leftMapping, indices[0]);
            const rightFieldMapping = getFieldMapping(rightMapping, indices[1]);


            // if either mapping is empty the field was not selected; set invalid to true
            // but do not notify the user.
            if (_.isEmpty(leftFieldMapping) || _.isEmpty(rightFieldMapping)) {
              $scope.invalid = true;
              return;
            }

            if (!areMappingsCompatibleForSirenJoin(leftFieldMapping, rightFieldMapping)) {
              if (!relation.errors) {
                relation.errors = [];
              }
              const leftFieldPath = `${indices[0].indexPatternId}/${indices[0].indexPatternType}/${indices[0].path}`;
              const rightFieldPath = `${indices[1].indexPatternId}/${indices[1].indexPatternType}/${indices[1].path}`;

              const left = `${leftFieldPath} has mapping ${JSON.stringify(_.pick(leftFieldMapping, [ 'index', 'type' ]), null, ' ')}`;
              const right = `${rightFieldPath} has mapping ${JSON.stringify(_.pick(rightFieldMapping, [ 'index', 'type' ]), null, ' ')}`;
              relation.errors.push(`<b>Incompatible fields:</b> ${left} while ${right}. They must be the same!`);
              $scope.invalid = true;
            }
          });
        })
        .catch((error) => {
          // it is ok to get a 404 when a type was set and the index pattern dropdown changes;
          // do not warn the user about this error, just log to the console.
          if (error.status === 404) {
            return console.log('Got a 404 while retrieving field mappings for a relation.');
          }
          notify.error(error);
        });
      };

      const updateDashboardsRelationsBasedOnTheIndicesRelations = function () {
        if (oldRelations && oldRelations.length) {
          const relationsIndices = $scope.relations.relationsIndices;

          if (relationsIndices.length < oldRelations.length) {
            // a relation was deleted
            const diff = _.difference(_.pluck(oldRelations, 'id'), _.pluck(relationsIndices, 'id'));
            _.each($scope.relations.relationsDashboards, function (relation) {
              if (diff.indexOf(relation.relation) !== -1) {
                relation.relation = '';
              }
            });
          } else if (relationsIndices.length === oldRelations.length) {
            // check if the definition of a relation was changed
            const clearRelation = function (oldRelationId) {
              _.each($scope.relations.relationsDashboards, function (relation) {
                if (relation.relation === oldRelationId) {
                  relation.relation = '';
                }
              });
            };

            for (let i = 0; i < relationsIndices.length; i++) {
              if (relationsIndices[i].id && oldRelations[i].id) {
                const newRelation = relationsHelper.getRelationInfosFromRelationID(relationsIndices[i].id);
                const oldRelation = relationsHelper.getRelationInfosFromRelationID(oldRelations[i].id);

                if (newRelation.source.index !== oldRelation.source.index || // left index changed
                    newRelation.target.index !== oldRelation.target.index) { // right index changed
                  clearRelation(oldRelations[i].id);
                }
              }
            }
          }
        }
      };

      const isEqual = _($scope.relations.relationsIndices).map(function (relation) {
        return _.omit(relation, [ '$$hashKey', 'errors', 'id' ]);
      }).isEqual(oldRelations);
      if (!isEqual) {
        $scope.changed = true;
        return checkJoinMappings()
        .then(() => $scope.isObjectValid())
        .then(() => updateDashboardsRelationsBasedOnTheIndicesRelations());
      }
    };

    // Listen to changes of relations between indices
    $scope.$watch(function ($scope) {
      return _.map($scope.relations.relationsIndices, function (relation) {
        // kibi_select can set the index pattern type to null, but it is stored as an empty string,
        // so we need to normalize to properly detect changes.
        for (const index of relation.indices) {
          if (index.indexPatternType === null) {
            index.indexPatternType = '';
          }
        }
        const normalized = _.omit(relation, ['$$hashKey', 'errors', 'id']);
        return normalized;
      });
    }, function (newRelations, oldRelations) {
      $scope.updateIndicesGraph(oldRelations);
    }, true);

    const indicesGraphExportOff = $rootScope.$on('egg:indicesGraph:results', function (event, method, results) {
      switch (method) {
        case 'exportGraph':
          $scope.relations.relationsIndicesSerialized = results;
          break;
        case 'importGraph':
          $timeout(() => {
            $rootScope.$emit('egg:indicesGraph:run', 'stop');
          }, 1000);
          break;
        default:
      }
    });
    const dashboardsGraphExportOff = $rootScope.$on('egg:dashboardsGraph:results', function (event, method, results) {
      switch (method) {
        case 'exportGraph':
          $scope.relations.relationsDashboardsSerialized = results;
        case 'importGraph':
          $timeout(() => {
            $rootScope.$emit('egg:dashboardsGraph:run', 'stop');
          }, 1000);
          break;
        default:
      }
    });

    // The State is listening for this event too, and modifies the location in the handler,
    // which means that a second routeChangeStart event will be triggered when clicking on section links.
    // To avoid displaying a double confirmation, we store the user choice for the whole cycle.
    $scope.dialogResult = null;
    const cancelRouteChangeHandler = $rootScope.$on('$routeChangeStart', function (event) {
      if (!$scope.changed) {
        return;
      }
      if ($scope.dialogResult === null) {
        $scope.dialogResult = $window.confirm('There are unsaved changes to the relational configuration,' +
                                              ' are you sure you want to leave the page?');
      }
      if ($scope.dialogResult === false) {
        event.preventDefault();
        $timeout(function () {
          $scope.dialogResult = null;
        });
      }
    });

    const onBeforeUnload = function () {
      if ($scope.changed) {
        return 'There are unsaved changes to the relational configuration, are you sure you want to leave the page?';
      }
    };
    $($window).on('beforeunload', onBeforeUnload);

    const cancelLogoutHandler = $rootScope.$on('kibi_access_control:logout', function (event) {
      if (!$scope.changed) {
        return;
      }
      if ($window.confirm('There are unsaved changes to the relational configuration,' +
                          ' are you sure you want to logout?') === false) {
        event.preventDefault();
        return;
      }
      $($window).off('beforeunload', onBeforeUnload);
      cancelRouteChangeHandler();
    });

    $scope.$on('$destroy', function () {
      $($window).off('beforeunload', onBeforeUnload);
      cancelRouteChangeHandler();
      cancelLogoutHandler();
      indicesGraphExportOff();
      dashboardsGraphExportOff();
    });

    $scope.isObjectValid = function () {
      const { validDashboards, validIndices } = relationsHelper.checkIfRelationsAreValid($scope.relations);
      $scope.dashboardsRelationsAreValid = validDashboards;
      $scope.indicesRelationsAreValid = validIndices;
      return validIndices && validDashboards;
    };
    $scope.isObjectValid();

    $scope.submit = function () {
      $scope.relations.relationsIndices = _.map($scope.relations.relationsIndices, function (relation) {
        return _.omit(relation, [ 'errors' ]);
      });
      $scope.relations.relationsDashboards = _.map($scope.relations.relationsDashboards, function (relation) {
        return _.omit(relation, [ 'errors' ]);
      });

      return config.set('kibi:relations', $scope.relations)
      .then(() => config.set('kibi:relationalPanel', $scope.relationalPanel))
      .then(() => {
        notify.info('Relations saved');
        $scope.changed = false;
      })
      .catch(notify.error);
    };
  });
});
