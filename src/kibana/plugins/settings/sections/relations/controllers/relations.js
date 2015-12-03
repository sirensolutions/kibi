define(function (require) {

  require('eeg');
  require('css!plugins/settings/sections/relations/styles/relations.css');

  var $ = require('jquery');
  var _ = require('lodash');

  var app = require('modules').get('apps/settings', ['kibana']);

  require('routes')
  .when('/settings/relations', {
    template: require('text!plugins/settings/sections/relations/index.html'),
    reloadOnSearch: false
  });

  app.controller('RelationsController', function ($rootScope, $scope, config, Private, $element) {
    var urlHelper = Private(require('components/kibi/url_helper/url_helper'));
    var color = Private(require('components/vislib/components/color/color'));

    $scope.relations = config.get('kibi:relations');
    $scope.relationalPanel = config.get('kibi:relationalPanel');

    $scope.$watch('relationalPanel', function () {
      config.set('kibi:relationalPanel', $scope.relationalPanel);
    });

    var indexToDashboardsMap = null;
    var nodeTypes = [];

    /**
     * Filters out the dashboards that are not relevant in the row with the given id
     */
    $scope.filterDashboards = function (id, value) {
      var relDash = $scope.relations.relationsDashboards[id];

      if (!value) {
        // this is the watched value
        return _.pluck($scope.relations.relationsIndices, 'id').concat(relDash);
      }
      if (!!value) {
        var remove = true;

        // do not remove if the dashboard is associated with an index
        if (!!indexToDashboardsMap) {
          _.each(indexToDashboardsMap, function (dashboards) {
            if (dashboards.indexOf(value) !== -1) {
              remove = false;
              return false;
            }
          });
        }

        // remove if the dashboard is not in the list of dashboards that are directly connected to value
        var connectedDashboards = [];
        if (!!relDash.dashboards[0] && !relDash.dashboards[1]) {
          connectedDashboards = _getConnectedDashboards(relDash.dashboards[0], relDash.relation);
        } else if (!!relDash.dashboards[1] && !relDash.dashboards[0]) {
          connectedDashboards = _getConnectedDashboards(relDash.dashboards[1], relDash.relation);
        } else if (!relDash.dashboards[0] && !relDash.dashboards[1] && !!relDash.relation) {
          // filter based on the selected relation
          connectedDashboards = _getConnectedDashboards(null, relDash.relation);
        }
        if (connectedDashboards.length && connectedDashboards.indexOf(value) === -1) {
          remove = true;
        }

        if (!!relDash.dashboards[0] && !!relDash.dashboards[1] && !!relDash.relation) {
          remove = true;
        }
        return remove;
      }
      return false;
    };

    /**
     * Returns the index associated with dashboardId
     */
    function _getIndexForDashboard(dashboardId) {
      var dIndex = '';

      if (!dashboardId) {
        return '';
      }
      _.each(indexToDashboardsMap, function (map, index) {
        if (map.indexOf(dashboardId) !== -1) {
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
      var index = _getIndexForDashboard(dashboardId);

      return _($scope.relations.relationsIndices).map(function (relInd) {
        if (!relDash || relDash === relInd.id) {
          var dashboards = [];

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
     * Filters out the relations that are not relevant in the row with the given id
     */
    $scope.filterRelations = function (id, relationId) {
      var dashboards = $scope.relations.relationsDashboards[id].dashboards;
      var lIndex = '';
      var rIndex = '';

      if (!relationId) {
        return _.pluck($scope.relations.relationsIndices, 'id')
        .concat(_.pluck($scope.relations.relationsIndices, 'label'))
        .concat(dashboards);
      }
      _.each(indexToDashboardsMap, function (map, index) {
        if (map.indexOf(dashboards[0]) !== -1) {
          lIndex = index;
        }
        if (map.indexOf(dashboards[1]) !== -1) {
          rIndex = index;
        }
        if (!!lIndex && !!rIndex) {
          return false;
        }
      });

      return (!!lIndex || !!rIndex) && !_($scope.relations.relationsIndices).map(function (relInd) {
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
      }).compact().contains(relationId);
    };

    /**
     * Returns a unique identifier for the relation between the indices indexa and indexb
     */
    function _getJoinIndicesUniqueID(indexa, indexb) {
      var ia = indexa.indexPatternId.replace(/\//, '-slash-') + '/' + indexa.path.replace(/\//, '-slash-');
      var ib = indexb.indexPatternId.replace(/\//, '-slash-') + '/' + indexb.path.replace(/\//, '-slash-');
      return ia < ib ? ia + '/' + ib : ib + '/' + ia;
    }

    function _getRelationLabel(relationId) {
      var label;

      _.each($scope.relations.relationsIndices, function (relation) {
        if (relation.id === relationId) {
          label = relation.label;
          return false;
        }
      });
      return label;
    }

    /**
     * Updates the relationships between dashboards
     */
    function _updateRelationsDashboards(oldRelations) {
      var g = {
        options: {
          onNodeDragEnd: function () {
            $rootScope.$emit('egg:dashboardsGraph:run', 'exportGraph');
          },
          onLinkClick: function (el, d, i) {
            _.each($scope.relations.relationsDashboards, function (relation) {
              if (relation.dashboards.indexOf(d.source.label) !== -1 &&
                  relation.dashboards.indexOf(d.target.label) !== -1) {
                relation.enabled = !relation.enabled;
                save('dashboards');
                return false;
              }
            });
          },
          monitorContainerSize: true,
          alwaysShowLinksLabels: true,
          stopAfter: 2000,
          groupingForce: {},
          nodeIcons: {},
          minNodeSize: 20,
          colors: {}
        },
        nodes: [],
        links: []
      };

      var relationId = function (relation) {
        var i0 = relation.dashboards[0];
        var i1 = relation.dashboards[1];
        return relation.relation + (i0 < i1 ? i0 + i1 : i1 + i0);
      };

      // check for duplicates
      var uniq = _.groupBy($scope.relations.relationsDashboards, function (relation) {
        if (relation.relation) {
          return relationId(relation);
        }
      });

      $scope.invalid = false;
      _.each($scope.relations.relationsDashboards, function (relDash) {
        var error = '';

        if (!!relDash.dashboards[0] && !!relDash.dashboards[1]) {
          if (relDash.relation) {
            var key = relationId(relDash);
            if (uniq[key].length !== 1) {
              error = 'This row has already been defined!';
            }
            // by default the relation is enabled
            if (relDash.enabled === undefined) {
              relDash.enabled = true;
            }
            // build the graph visualisation
            var sourceNodeIndexId = _getIndexForDashboard(relDash.dashboards[0]);
            var targetNodeIndexId = _getIndexForDashboard(relDash.dashboards[1]);

            g.nodes.push({
              id: relDash.dashboards[0],
              label: relDash.dashboards[0],
              nodeType: sourceNodeIndexId,
              size: g.options.minNodeSize
            });
            g.nodes.push({
              id: relDash.dashboards[1],
              label: relDash.dashboards[1],
              nodeType: targetNodeIndexId,
              size: g.options.minNodeSize
            });
            g.links.push({
              source: relDash.dashboards[0],
              target: relDash.dashboards[1],
              linkType: 'link',
              html: '<div>' +
                    '<input type="checkbox" ' + (relDash.enabled ? 'checked' : '') + '/>' +
                    '&nbsp;<label>' + _getRelationLabel(relDash.relation) + '</label>' +
                    '</div>',
              undirected: true
            });
          }
        }
        relDash.error = error;
        if (!!error) {
          $scope.invalid = true;
        }
      });

      _.each(nodeTypes, function (nodeType) {
        g.options.colors[nodeType] = $scope.typeToColor(nodeType);
      });

      g.nodes = _.uniq(g.nodes, function (node) {
        return node.id;
      });
      $scope.dashboardsGraph = g;
      var isEqual = _($scope.relations.relationsDashboards).map(function (relation) {
        return _.omit(relation, [ '$$hashKey', 'error' ]);
      }).isEqual(oldRelations);
      if (_isValid('dashboards') && !isEqual) {
        save('dashboards');
      }
    }

    $scope.$watch(function ($scope) {
      return _.map($scope.relations.relationsDashboards, function (relation) {
        return _.omit(relation, [ 'error' ]);
      });
    }, function (newRelations, oldRelations) {
      if (indexToDashboardsMap === null) {
        urlHelper.getIndexToDashboardMap().then(function (map) {
          indexToDashboardsMap = map;
          _updateRelationsDashboards(oldRelations);
        });
      } else {
        _updateRelationsDashboards(oldRelations);
      }
    }, true);

    $scope.$watch(function ($scope) {
      return _.map($scope.relations.relationsIndices, function (relation) {
        return _.omit(relation, 'error');
      });
    }, function (newRelations, oldRelations) {
      // each node is an index
      var g = {
        options: {
          showLegend: false,
          monitorContainerSize: true,
          alwaysShowLinksLabels: true,
          stopAfter: 2000,
          groupingForce: {},
          nodeIcons: {},
          minNodeSize: 20,
          colors: {}
        },
        nodes: [],
        links: []
      };

      // check for duplicates
      var uniq = _.groupBy($scope.relations.relationsIndices, function (relation, offset) {
        var indexa = relation.indices[0];
        var indexb = relation.indices[1];

        if (indexa.indexPatternId && indexa.path && indexb.indexPatternId && indexb.path) {
          return _getJoinIndicesUniqueID(indexa, indexb);
        }
        return offset;
      });

      $scope.invalid = false;
      _.each($scope.relations.relationsIndices, function (relation) {
        var indices = relation.indices;
        var error = '';

        if (indices[0].indexPatternId && indices[0].path && indices[1].indexPatternId && indices[1].path) {
          var key = _getJoinIndicesUniqueID(indices[0], indices[1]);

          if (uniq[key].length !== 1) {
            error = 'This row has already been defined!';
          }
          if (indices[0].indexPatternId === indices[1].indexPatternId &&
              indices[0].path === indices[1].path) {
            error += 'Left and right sides of the relation cannot be the same.';
          }
          relation.id = key;

          if (relation.label) {
            // build the graph visualisation
            var sourceNodeId = indices[0].indexPatternId;
            var targetNodeId = indices[1].indexPatternId;

            g.nodes.push({
              id: sourceNodeId,
              label: sourceNodeId,
              nodeType: sourceNodeId,
              size: g.options.minNodeSize
            });
            g.nodes.push({
              id: targetNodeId,
              label: targetNodeId,
              nodeType: targetNodeId,
              size: g.options.minNodeSize
            });
            g.links.push({
              source: sourceNodeId,
              target: targetNodeId,
              linkType: relation.label,
              undirected: true
            });

            // build types array to build color map
            if (nodeTypes.indexOf(sourceNodeId) === -1) {
              nodeTypes.push(sourceNodeId);
            }
            if (nodeTypes.indexOf(targetNodeId) === -1) {
              nodeTypes.push(targetNodeId);
            }

          }
        }

        relation.error = error;
        if (!!error) {
          $scope.invalid = true;
        }
      });

      $scope.typeToColor = color(nodeTypes);
      _.each(nodeTypes, function (nodeType) {
        g.options.colors[nodeType] = $scope.typeToColor(nodeType);
      });

      g.nodes = _.uniq(g.nodes, function (node) {
        return node.id;
      });
      $scope.indicesGraph = g;

      var isEqual = _($scope.relations.relationsIndices).map(function (relation) {
        return _.omit(relation, [ '$$hashKey', 'error' ]);
      }).isEqual(oldRelations);
      if (_isValid('indices') && !isEqual) {
        save('indices').then(function () {
          if (oldRelations && oldRelations.length) {
            var relationsIndices = config.get('kibi:relations').relationsIndices;

            if (relationsIndices.length < oldRelations.length) {
              // a relation was deleted
              var diff = _.difference(_.pluck(oldRelations, 'id'), _.pluck(relationsIndices, 'id'));
              _.each($scope.relations.relationsDashboards, function (relation) {
                if (diff.indexOf(relation.relation) !== -1) {
                  relation.relation = '';
                }
              });
            } else if (relationsIndices.length === oldRelations.length) {
              // check if the definition of a relation was changed
              var clearRelation = function (oldRelationId) {
                _.each($scope.relations.relationsDashboards, function (relation) {
                  if (relation.relation === oldRelationId) {
                    relation.relation = '';
                  }
                });
              };

              for (var i = 0; i < relationsIndices.length; i++) {
                if (relationsIndices[i].id && oldRelations[i].id) {
                  var newRelationId = relationsIndices[i].id.split('/');
                  var oldRelationId = oldRelations[i].id.split('/');

                  if (newRelationId[0] !== oldRelationId[0] || newRelationId[2] !== oldRelationId[2]) {
                    clearRelation(oldRelations[i].id);
                  }
                }
              }
            }
          }
        });
      }
    }, true);

    var indicesGraphExportOff = $rootScope.$on('egg:indicesGraph:results', function (event, method, results) {
      if (method === 'exportGraph') {
        var relations = config.get('kibi:relations');
        relations.relationsIndicesSerialized = results;
        config.set('kibi:relations', relations);
      }
    });
    var dashboardsGraphExportOff = $rootScope.$on('egg:dashboardsGraph:results', function (event, method, results) {
      if (method === 'exportGraph') {
        var relations = config.get('kibi:relations');
        relations.relationsDashboardsSerialized = results;
        config.set('kibi:relations', relations);
      }
    });
    $scope.$on('$destroy', function () {
      indicesGraphExportOff();
      dashboardsGraphExportOff();
    });

    function _isValid(graph) {
      if (graph === 'indices') {
        return $element.find('form[name="indicesForm"]').hasClass('ng-valid');
      } else {
        return $element.find('form[name="dashboardsForm"]').hasClass('ng-valid');
      }
    }

    function save(graph) {
      var relations = config.get('kibi:relations');

      if (graph === 'indices') {
        relations.relationsIndices = _.map($scope.relations.relationsIndices, function (relation) {
          return _.omit(relation, [ 'error' ]);
        });
      } else {
        relations.relationsDashboards = _.map($scope.relations.relationsDashboards, function (relation) {
          return _.omit(relation, [ 'error' ]);
        });
      }

      return config.set('kibi:relations', relations);
    }
  });
});
