import { IndexPatternAuthorizationError } from 'ui/errors';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import template from 'plugins/investigate_core/management/sections/kibi_entities/index.html';
import 'plugins/investigate_core/ui/directives/saved_search_nav/saved_search_nav';
import 'plugins/kibana/management/sections/indices/edit_index_pattern/edit_index_pattern';
import 'plugins/investigate_core/management/sections/kibi_entities/styles/entities.less';
import 'plugins/investigate_core/management/sections/indices/index_options/index_options';
import './entity_relations';
import './create_index_pattern';
import './create_eid';
import 'angular-ui-tree';

uiRoutes
.when('/management/siren/indexesandrelations/create/:indexPatternName?', {
  template,
  reloadOnSearch: false,
});

uiRoutes
.when('/management/siren/indexesandrelations/:entityId/:tab?', {
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
          kbnUrl.redirect('/management/siren/indexesandrelations');
          return Promise.halt();
        } else {
          return courier.redirectWhenMissing('/management/siren/indexesandrelations')(error);
        }
      });
    },
    activeTab: function ($route) {
      return $route.current.params.tab;
    }
  }
});

uiRoutes
.when('/management/siren/indexesandrelations', {
  template,
  reloadOnSearch: false,
  resolve: {
    redirect: function ($location, kibiDefaultIndexPattern) {
      // kibi: use our service to get default indexPattern
      return kibiDefaultIndexPattern.getDefaultIndexPattern().then(defaultIndex => {
        let path;
        if (defaultIndex.id) {
          path = `/management/siren/indexesandrelations/${defaultIndex.id}`;
        } else {
          path = `/management/siren/indexesandrelations/create/`;
        };
        $location.path(path).replace();
      }).catch(err => {
        const path = '/management/siren/indexesandrelations';
        $location.path(path).replace();
      });
    }
  }
});

uiModules.get('apps/management', ['kibana', 'ui.tree'])
.controller('entities', function ($scope, $route, $injector, kbnUrl, createNotifier) {
  $scope.state = { section: 'entity_panel' };
  $scope.indexPattern = $route.current.locals.selectedEntity;

  // This object will contain the relational graph control functions (for now just reload)
  $scope.relationalGraphControl = {};

  const notify = createNotifier({
    location: 'Queries Editor'
  });

  const isRelationalGraphAvailable = $injector.has('sirenRelationalGraphDirective');

  $scope.createNewIndexPattern = function () {
    $scope.state.section = 'create_ip';
  };

  if($route.current.$$route.originalPath.includes('/create/')) {
    $scope.createNewIndexPattern();
  };

  $scope.createNewVirtualEntity = function () {
    $scope.state.section = 'create_eid';
  };

  $scope.toggleRelationalGraph = function () {
    if (isRelationalGraphAvailable) {
      $scope.isRelationalGraphVisible = !$scope.isRelationalGraphVisible;
    } else {
      notify.warning('Siren Relational Graph not available, please install the Siren Graph Browser');
    }
  };

  // This function is here to be called in entity_relations.js (as that directive inherits this scope)
  $scope.updateSelectedMenuItem = function (newSelectedMenuItem) {
    $scope.selectedMenuItem = newSelectedMenuItem;
  };

  // Needed until we migrate the panels to use the new generic "entity"
  $scope.$watch('selectedMenuItem.id', (itemId) => {
    if (itemId && (!$route.current.locals.selectedEntity || $route.current.locals.selectedEntity.id !== itemId)) {
      kbnUrl.change(`/management/siren/indexesandrelations/${itemId}`);
    } else {
      const entity = $route.current.locals.selectedEntity;
      if (entity && (!$scope.entity || $scope.entity.id !== entity.id || $scope.entity.type !== entity.type)) {
        $scope.entity = entity;
        $scope.selectedMenuItem = { id: entity.id, type: entity.type };
      }
    }
  });
});
