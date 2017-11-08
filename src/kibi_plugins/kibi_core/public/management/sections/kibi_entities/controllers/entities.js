import { IndexPatternAuthorizationError } from 'ui/errors';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import chrome from 'ui/chrome';
import template from 'plugins/kibi_core/management/sections/kibi_entities/index.html';
import 'plugins/kibi_core/ui/directives/saved_search_nav/saved_search_nav';
import 'plugins/kibana/management/sections/indices/edit_index_pattern/edit_index_pattern';
import 'plugins/kibi_core/management/sections/kibi_entities/styles/entities.less';
import 'plugins/kibi_core/management/sections/indices/index_options/index_options';
import './entity_relations';
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
    selectedEntity: function ($route, courier, Promise, createNotifier, kbnUrl, ontologyClient) {
      const objectId = $route.current.params.entityId;
      console.log('look for: ' + objectId);
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

uiModules.get('apps/management', ['kibana', 'ui.tree'])
.controller('entities', function ($scope, $route, kbnUrl, createNotifier, indexPatterns, ontologyClient) {
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
    let entityPromise = Promise.resolve();
    console.log('selectedMenuItem Entities');
    console.log(item);

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

  $scope.$watch($scope.fieldFilter, (filter) => {
    console.log('fieldfilter entities');
    console.log(filter);
  });
});
