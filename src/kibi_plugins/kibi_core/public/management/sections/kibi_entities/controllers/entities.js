import { IndexPatternAuthorizationError } from 'ui/errors';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import chrome from 'ui/chrome';
import template from 'plugins/kibi_core/management/sections/kibi_entities/index.html';
import 'plugins/kibi_core/ui/directives/saved_search_nav/saved_search_nav';
import 'plugins/kibana/management/sections/indices/edit_index_pattern/edit_index_pattern';
import 'plugins/kibi_core/management/sections/kibi_entities/styles/entities.less';
import './create_index_pattern';
import './create_eid';
import 'angular-ui-tree';

uiRoutes
.when('/management/siren/entities', {
  template,
  reloadOnSearch: false,
  resolve: {}
});

uiRoutes
.when('/management/siren/entities/:entityId', {
  template: template,
  resolve: {
    selectedItem: function ($route, courier, Promise, createNotifier, kbnUrl, ontologyClient) {
      const objectId = $route.current.params.entityId;
      console.log('look for: ' + objectId);
      return courier.indexPatterns
      .getIds()
      .then((indexPattenrIds) => {
        console.log('indexPattenrIds');
        console.log(indexPattenrIds);
        if (_.contains(indexPattenrIds, objectId)) {
          return courier.indexPatterns.get(objectId);
        } else {
          // check the virtual entities
          console.log('checking virtual entities');
          return ontologyClient.getEntityById(objectId)
          .then((virtualEntity) => {
            console.log('found VirtualEntity');
            console.log(virtualEntity);
            return virtualEntity;
          });
        }
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

function controller($scope, $route, kbnUrl, createNotifier, indexPatterns, ontologyClient) {
  $scope.state = { section: 'entity_panel' };

  const notify = createNotifier({
    location: 'Queries Editor'
  });

  $scope.createNewIndexPattern = function () {
    $scope.state.section = 'create_ip';
  };

  $scope.createNewVirtualEntity = function () {
    $scope.state.section = 'create_eid';
  }

  // Needed until we migrate the panels to use the new generic "entity"
  $scope.$watch('selectedMenuItem', (item) => {
    const isNewEntity = !!$scope.entity;
    let entityPromise = Promise.resolve();
    console.log('$scope.entity');
    console.log($scope.entity);
    console.log('item');
    console.log(item);
    if (!$scope.entity || !(item.id === $scope.entity.id && item.type === $scope.entity.type)) {
      if (item && item.type === 'INDEX_PATTERN') {
        console.log('watched selectedMenuItem - index-pattern');
        console.log(item);

        entityPromise =  indexPatterns.get(item.id).then((indexPattern) => {
          indexPattern.type = 'INDEX_PATTERN';
          return indexPattern;
        });
      } else if (item && item.type === 'VIRTUAL_ENTITY') {
        console.log('watched selectedMenuItem - virtual-entity');
        console.log(item);

        entityPromise = ontologyClient.getEntityById(item.id)
        .then((entity) => {
          return entity;
        });
      } else if (item === undefined) {
        // just check for undefined, as we set it to null when we create an indexpattern/eid
        // triggered on watch initialization
        const routeItem = $route.current.locals.selectedItem;
        if (routeItem) {
          const selectedItem = { id: routeItem.id };
          // check if it is an indexPattern
          if (routeItem.constructor.name === 'IndexPattern') {
            selectedItem.type = 'INDEX_PATTERN';
          } else {
            selectedItem.type = 'VIRTUAL_ENTITY';
          }
          entityPromise = Promise.resolve(selectedItem);
        } else {
          // select the first indexpattern
          entityPromise = indexPatterns.getIds()
          .then((ids) => {
            if (ids.length) {
              const sortedIds = _.sortBy(ids, (id) => { return id; });
              return indexPatterns.get(sortedIds[0])
              .then((indexPattern) => {
                console.log('autoselecting first indexpattern: ' + indexPattern.id);
                indexPattern.type = 'INDEX_PATTERN';
                console.log('autoselect item');
                return indexPattern;
              });
            }
          });
        }
      }

      // Keep it here as it will be needed for the relational graph
      Promise.resolve(entityPromise)
      .then((entity) => {
        console.log('isNewEntity');
        console.log(isNewEntity);
        if (isNewEntity) {
          kbnUrl.change(`/management/siren/entities/${entity.id}`);
        } else {
          console.log('final entity');
          console.log(entity);
          $scope.entity = entity;
          $scope.selectedMenuItem = { id: entity.id, type: entity.type };
        }
      })
    }
  });
}

uiModules
.get('apps/management', ['kibana', 'ui.tree'])
.controller('Entities', controller);
