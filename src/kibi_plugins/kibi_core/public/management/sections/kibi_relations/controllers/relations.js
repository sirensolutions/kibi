import { RelationsHelperFactory } from 'ui/kibi/helpers/relations_helper';
import { VislibComponentsColorColorProvider } from 'ui/vis/components/color/color';
import 'ui/kibi/directives/eeg';
import 'plugins/kibi_core/management/sections/kibi_relations/styles/relations.less';
import 'ui/kibi/directives/kibi_validate';
import template from 'plugins/kibi_core/management/sections/kibi_relations/index.html';
import _ from 'lodash';
import $ from 'jquery';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';

uiRoutes
.when('/management/siren/relations', {
  template,
  reloadOnSearch: false
});

function controller(Promise, es, kibiState, $rootScope, $scope, $timeout, config, Private, kbnUrl, createNotifier, $window, $element) {
  const notify = createNotifier({
    location: 'Relations Editor'
  });
  const color = Private(VislibComponentsColorColorProvider);
  const relationsHelper = Private(RelationsHelperFactory);

  $scope.unique = _.unique;
  $scope.defaults = {
    limit: -1, // -1 mean use the global one from kibi:joinLimit
    type: 'SEARCH_JOIN'
  };

  // advanced options
  $scope.edit = function (index) {
    kbnUrl.change('/management/siren/relations/{{ id }}', { id: index });
  };

  $scope.relations = config.get('kibi:relations');

  // track if the configuration has been changed
  $scope.changed = false;

  const nodeTypes = [];

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
        node.size = 20;
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
            fields: [ indices[0].path ],
            includeDefaults: true
          }),
          es.indices.getFieldMapping({
            index: [ indices[1].indexPatternId ],
            type: indices[1].indexPatternType || [],
            fields: [ indices[1].path ],
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
          return console.log('Got a 404 while retrieving field mappings for a relation.'); // eslint-disable-line no-console
        }
        notify.error(error);
      });
    };

    const isEqual = _($scope.relations.relationsIndices).map(function (relation) {
      return _.omit(relation, [ '$$hashKey', 'errors', 'id' ]);
    }).isEqual(oldRelations);
    if (!isEqual) {
      $scope.changed = true;
      return checkJoinMappings()
      .then(() => $scope.isValid());
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
        }, 1); //stop immediately basically disabling the animation
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
  });

  $scope.isValid = function () {
    const { validIndices } = relationsHelper.checkIfRelationsAreValid($scope.relations);
    return validIndices;
  };
  $scope.isValid();

  $scope.saveObject = function () {
    $scope.relations.relationsIndices = _.map($scope.relations.relationsIndices, function (relation) {
      return _.omit(relation, [ 'errors' ]);
    });

    return config.set('kibi:relations', $scope.relations)
    .then(() => {
      notify.info('Relations saved');
      $scope.changed = false;
    })
    .catch(notify.error);
  };

  // expose some methods to the navbar buttons
  [ 'isValid', 'saveObject' ]
  .forEach(name => {
    $element.data(name, $scope[name]);
  });
}

uiModules
.get('apps/management', ['kibana'])
.directive('kibiDebounce', function ($timeout) {
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
})
.directive('kibiStopEnterKeyDown', function () {
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
})
.directive('kibiRelationsSearchBar', () => {
  return {
    restrict: 'A',
    scope: true,
    link: function (scope, element, attrs) {

      scope.searchRelations = function () {
        const relations = _.get(scope, attrs.kibiRelationsSearchBarPath);
        const searchString = scope[attrs.ngModel];

        if (!searchString || searchString.length < 2) {
          relations.forEach((relation) => relation.$$hidden = false);
          return;
        }

        const search = function (obj, searchString) {
          let result;
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              if (typeof obj[key] === 'object' && obj[key] !== null || _.isArray(obj[key]) && obj[key].length) {
                result = search(obj[key], searchString);
                if (result) {
                  return result;
                }
              }
              if (typeof obj[key] === 'string') {
                const found = obj[key].match(new RegExp(searchString, 'gi'));
                if (found && found.length) {
                  return true;
                }
              }
            }
          }
          return result;
        };

        relations.forEach((relation) => {
          if (search(relation, searchString)) {
            relation.$$hidden = false;
          } else {
            relation.$$hidden = true;
          }
        });
      };
    }
  };
})
.controller('RelationsController', controller);
