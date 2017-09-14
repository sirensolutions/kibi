import { management } from 'ui/management';
import './create_index_pattern';
import './edit_index_pattern';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from 'plugins/kibana/management/sections/indices/index.html';

const indexPatternsResolutions = {
  indexPatternIds: function (courier) {
    return courier.indexPatterns.getIds();
  }
};

// add a dependency to all of the subsection routes
uiRoutes
//TODO MERGE 5.5.2 add kibi comment as needed
.defaults(/management\/siren\/indices/, {
  resolve: indexPatternsResolutions
});

uiRoutes
//TODO MERGE 5.5.2 add kibi comment as needed
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
        const ids = $route.current.locals.indexPatternIds;
        $scope.indexPatternList = ids.map(function (id) {
          //TODO MERGE 5.5.2 add kibi comment as needed
          return {
            id: id,
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

//TODO MERGE 5.5.2 add kibi comment as needed
management.getSection('kibana').register('indices', {
  display: 'Index Patterns',
  order: 0,
  url: '#/management/siren/indices/'
});
