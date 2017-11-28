import { management } from 'ui/management';
import './create_index_pattern';
import './edit_index_pattern';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from 'plugins/kibana/management/sections/indices/index.html';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

const indexPatternsResolutions = {
  indexPatterns: function (Private) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    return savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    }).then(response => response.savedObjects);
  }
};

// add a dependency to all of the subsection routes
uiRoutes
// kibi: route is changed to '/management\/siren\/indices/'
.defaults(/management\/siren\/indices/, {
  resolve: indexPatternsResolutions
});

uiRoutes
// kibi: route is changed to '/management\/siren\/index/'
.defaults(/management\/siren\/index/, {
  resolve: indexPatternsResolutions
});

// wrapper directive, which sets some global stuff up like the left nav
uiModules.get('apps/management')
.directive('kbnManagementIndices', function ($route, config, kbnUrl) {
  return {
    restrict: 'E',
    transclude: true,
    template: indexTemplate,
    link: function ($scope) {
      $scope.editingId = $route.current.params.indexPatternId;
      config.bindToScope($scope, 'defaultIndex');

      $scope.$watch('defaultIndex', function () {
        $scope.indexPatternList = $route.current.locals.indexPatterns.map(pattern => {
          const id = pattern.id;
          return {
            id: id,
            title: pattern.get('title'),
            url: kbnUrl.eval('#/management/siren/indices/{{id}}', { id: id }),
            class: 'sidebar-item-title ' + ($scope.editingId === id ? 'active' : ''),
            default: $scope.defaultIndex === id
          };
        });
      });

      $scope.$emit('application.load');
    }
  };
});

// kibi: url is changed to '#/management/siren/indices/'
management.getSection('kibana').register('indices', {
  display: 'Index Patterns',
  order: 0,
  url: '#/management/siren/indices/'
});
