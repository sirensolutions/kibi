import { uiModules } from 'ui/modules';
import template from './siren_relational_graph.html';
import chrome from 'ui/chrome';
import _ from 'lodash';
import linesPacked from 'plugins/graph_browser_vis/webpackShims/lines-packed';
import GraphHelperClass from 'plugins/graph_browser_vis/siren_graph_browser_helper';

uiModules
.get('kibana')
.directive('kibiRelationalGraph', function (Private, $timeout, ontologyClient) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isVisible: '=',
      selected: '='
    },
    template,
    link: function ($scope) {
      const GraphHelper = Private(GraphHelperClass);
      const graphHelper = new GraphHelper({});
      const kl = linesPacked.lines;
      let relationalGraph;
      $scope.graphInitialized = false;
      $scope.klOptions = {
        iconFontFamily: 'FontAwesome',
        backColour: 'white',
        overview: false,
        controlColour: 'grey',
        selectionColour: '#44D',
        hover: 100,
        selfLinks: true,
        handMode: true
      };

      $scope.klBasePath = chrome.getBasePath() + '/plugins/graph_browser_vis/webpackShims/';

      const updateRelationalGraph = function () {
        if (relationalGraph && $scope.isVisible) {
          graphHelper.focusOnNodes([$scope.selected.id], relationalGraph);
          relationalGraph.selection($scope.selected.id);
          relationalGraph.zoom('fit', { ids: $scope.selected.id, animate: true, time: 600 });
        }
      };

      const hexToRgb = function (hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };

      const loadGraph = function (init = true) {
        if (relationalGraph && $scope.isVisible) {
          return ontologyClient.getEntities()
          .then((entities) => {
            // add entities
            const klElements = _.reduce(entities, (total, entity) => {
              const node = {
                type: 'node',
                id: entity.id,
                d: { entityType: entity.type },
                t: entity.label,
                tc: false
              };
              if (entity.color && entity.color !== 'undefined') {
                node.c = entity.color;
              } else {
                node.c = '#000000';
              }

              if (entity.type === 'VIRTUAL_ENTITY') {
                const rgbColor = hexToRgb(node.c);
                const rgb = rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b;
                node.ha0 = {
                  c: 'rgba(' + rgb + ', 0.4)',  //the halo fill color
                  r: 34,                        //the halo radius
                  w: 3                          //the halo width
                };
              }

              if (entity.icon && entity.icon !== 'undefined') {
                node.fi = {
                  c: node.c,
                  t: kl.getFontIcon(entity.icon)
                };
                delete node.c;
              }

              total.push(node);
              return total;
            }, []);

            return klElements;
          })
          .then((klElements) => {
            return ontologyClient.getRelations()
            .then((relations) => {
              // add relations
              const excludeInverse = new Set();
              _.each(relations, (rel) => {
                if (!excludeInverse.has(rel.inverseOf)) {
                  const link = {
                    type: 'link',
                    t: rel.directLabel,
                    a2: true,
                    id: rel.id,
                    id1: rel.domain.id,
                    id2: rel.range.id,
                    c: 'rgb(0,153,255)',
                    w: 3
                  };
                  klElements.push(link);
                  excludeInverse.add(rel.id);
                }
              });
              return new Promise((fulfill, reject) => {
                if (init) {
                  relationalGraph.expand(klElements,
                    {
                      layout: {
                        fit: true,
                        tidy: true,
                        tightness: 4,
                        consistent: true
                      }
                    }, () => {
                      fulfill();
                    }
                  );
                } else {
                  relationalGraph.merge(klElements);
                }
              });
            });
          })
          .then(() => {
            updateRelationalGraph();
          });
        } else {
          return Promise.resolve();
        }
      };

      $scope.reloadGraph = function (init = true) {
        return loadGraph(init);
      };

      $scope.klReady = function (graph) {
        relationalGraph = graph;

        $scope.$watch('isVisible', (value) => {
          if (value && !$scope.graphInitialized) {
            const element =  document.getElementsByClassName('relational-graph');
            const height = element[0].offsetHeight;
            const width = element[0].offsetWidth;
            kl.setSize('relationalGraph', width, height);

            $scope.reloadGraph(!$scope.graphInitialized);
            $scope.graphInitialized = true;
          }
        });
      };

      $scope.klDblClick = function (id) {
        if (id && relationalGraph) {
          const node = relationalGraph.getItem(id);
          // this is to let other components react to the changed selection.
          $scope.selected.id = node.id;
          $scope.selected.type = node.d.entityType;
        }
      };
    }
  };
});
