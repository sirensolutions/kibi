import { management } from 'ui/management';
import './create_index_pattern';
import './edit_index_pattern';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from 'plugins/kibana/management/sections/indices/index.html';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

// kibi: removed not used
// - indexPatternsResolutions function not used anymore
// - route /management\/kibana\/indices/
// - route /management\/kibana\/indix/

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

// kibi: We hide this section as it is replaced by the new Entities one.
// management.getSection('kibana').register('indices', {
//   display: 'Index Patterns',
//   order: 0,
//   url: '#/management/kibana/indices/'
// });
