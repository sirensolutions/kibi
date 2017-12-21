import { IndexPatternAuthorizationError } from 'ui/errors';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import chrome from 'ui/chrome';
import template from 'plugins/kibi_core/management/sections/kibi_entities/index.html';
import linesPacked from 'plugins/kibi_graph_browser_vis/webpackShims/lines-packed';
import GraphHelperClass from 'plugins/kibi_graph_browser_vis/kibi_graph_browser_helper';
import 'plugins/kibi_core/ui/directives/saved_search_nav/saved_search_nav';
import 'plugins/kibana/management/sections/indices/edit_index_pattern/edit_index_pattern';
import 'plugins/investigate_core/management/sections/kibi_entities/styles/entities.less';
import 'plugins/investigate_core/management/sections/indices/index_options/index_options';
import './entity_relations';
import './create_index_pattern';
import './create_eid';
import 'angular-animate';
import 'angular-ui-tree';

uiRoutes
.when('/management/siren/entities/:entityId', {
  template: template,
  resolve: {
    selectedEntity: function ($route, courier, Promise, createNotifier, kbnUrl, ontologyClient) {
      const objectId = $route.current.params.entityId;
      return courier.indexPatterns
      .getIds()
      .then((indexPattenrIds) => {
        return ontologyClient.getEntityById(objectId)
        .then((virtualEntity) => {
          if (_.contains(indexPattenrIds, objectId)) {
            return courier.indexPatterns.get(objectId)
            .then((indexPattern) => {
              return _.assign(indexPattern, virtualEntity);
            });
          } else {
            return virtualEntity;
          }
        });
      })
      .catch((error) => {
        if (error instanceof IndexPatternAuthorizationError) {
          createNotifier().warning(`Access to index pattern ${$route.current.params.entityId} is forbidden`);
          kbnUrl.redirect('/management/siren/entities');
          return Promise.halt();
        } else {
          return courier.redirectWhenMissing('/management/siren/entities')(error);
        }
      });
    }
  }
});

uiRoutes
.when('/management/siren/entities', {
  template,
  reloadOnSearch: false,
  resolve: {
    redirect: function ($location, config, kibiDefaultIndexPattern) {
      // kibi: use our service to get default indexPattern
      return kibiDefaultIndexPattern.getDefaultIndexPattern().then(defaultIndex => {
        const path = `/management/siren/entities/${defaultIndex.id}`;
        $location.path(path).replace();
      }).catch(err => {
        const path = '/management/siren/entities';
        $location.path(path).replace();
      });
    }
  }
});

uiModules.get('apps/management', ['kibana', 'ui.tree', 'ngAnimate', /*'ngKeylines'*/])
.controller('entities', function ($scope, $route, $timeout, Private, kbnUrl, createNotifier, indexPatterns, ontologyClient) {
  $scope.state = { section: 'entity_panel' };

  const notify = createNotifier({
    location: 'Queries Editor'
  });

  $scope.createNewIndexPattern = function () {
    $scope.state.section = 'create_ip';
  };

  $scope.createNewVirtualEntity = function () {
    $scope.state.section = 'create_eid';
  };

  // Needed until we migrate the panels to use the new generic "entity"
  $scope.$watch('selectedMenuItem', (item) => {
    if (item && (!$route.current.locals.selectedEntity || $route.current.locals.selectedEntity.id !== item.id)) {
      kbnUrl.change(`/management/siren/entities/${item.id}`);
    } else {
      const entity = $route.current.locals.selectedEntity;
      if (entity && (!$scope.entity || $scope.entity.id !== entity.id || $scope.entity.type !== entity.type)) {
        $scope.entity = entity;
        $scope.selectedMenuItem = { id: entity.id, type: entity.type };
      }
    }
  });

  //
  // Relational graph stuffs
  //
  const GraphHelper = Private(GraphHelperClass);
  const graphHelper = new GraphHelper({});
  const kl = linesPacked.lines;
  let relationalGraph;
  let graphInitialized = false;
  $scope.isRelationalGraphVisible = false;
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

  $scope.klBasePath = chrome.getBasePath() + '/plugins/kibi_graph_browser_vis/webpackShims/';
  $scope.toggleRelationalGraph = function () {
    $scope.isRelationalGraphVisible = !$scope.isRelationalGraphVisible;
  };

  const updateRelationalGraph = function () {
    // wait for the digest cycle to finish
    $timeout(() => {
      if (relationalGraph && $scope.isRelationalGraphVisible) {
        graphHelper.focusOnNodes([$scope.selectedMenuItem.id], relationalGraph);
        relationalGraph.selection($scope.selectedMenuItem.id);
        // TODO with the latest version we can zoom on an arbitrary array of elements
        // the selected entity and the direct neighbours
        // relationalGraph.zoom('fit', { ids: $scope.selectedMenuItem.id, animate: true});
        relationalGraph.zoom('selection', { animate: true, time: 600 });
      }
    });
  };

  const hexToRgb = function (hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  };

  const loadGraph = function (init = true) {
    if (relationalGraph && $scope.isRelationalGraphVisible) {
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
            }
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
              relationalGraph.expand(klElements, {layout: {fit: true, tidy: true, tightness: 4}}, () => {
                fulfill();
              });
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

    $scope.$watch(_.throttle(() => {
      const element =  document.getElementsByClassName('relational-graph');
      if (element && element[0] && element[0].attributes['ng-show']) {
        return  {
          h: element[0].offsetHeight,
          w: element[0].offsetWidth
        };
      } else {
        return {
          h: 0,
          w: 0
        };
      }
    }, 200), (value, oldValue) => {
      if (relationalGraph && value && oldValue && (value.h !== oldValue.h || value.w !== oldValue.w)) {
        if (oldValue.w === 0 || oldValue.h === 0) {
          $scope.reloadGraph(!graphInitialized);
          graphInitialized = true;
        }
        kl.setSize('relationalGraph', value.w, value.h);
        // updateRelationalGraph();
      }
    });
  };

  $scope.klDblClick = function (id) {
    if (id && relationalGraph) {
      const node = relationalGraph.getItem(id);
      $scope.selectedMenuItem = { id: node.id, type: node.d.entityType };
    }
  };
  //
  // End of relational graph stuffs
  //
});
