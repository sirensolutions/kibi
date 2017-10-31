import _ from 'lodash';
import { uiModules } from 'ui/modules';
import indexOptionsTemplate from './index_options.html';

uiModules.get('apps/management')
.directive('indexOptions', function (ontologyClient) {

  return {
    restrict: 'E',
    template: indexOptionsTemplate,
    scope: {
      entity: '=',
      save: '='
    },
    link: function ($scope) {
      $scope.save = function () {
        if ($scope.entity.type === 'VIRTUAL_ENTITY') {
          return ontologyClient.updateEntity($scope.entity);
        } else {
          const entity = {
            id: $scope.entity.id
          };
          if ($scope.entity.label) {
            entity.label = $scope.entity.label;
          }
          if ($scope.entity.type) {
            entity.type = $scope.entity.type;
          }
          if ($scope.entity.icon) {
            entity.icon = $scope.entity.icon;
          }
          if ($scope.entity.color) {
            entity.color = $scope.entity.color;
          }
          if ($scope.entity.shortDescription) {
            entity.shortDescription = $scope.entity.shortDescription;
          }
          if ($scope.entity.longDescription) {
            entity.longDescription = $scope.entity.longDescription;
          }
          return ontologyClient.updateEntity(entity);
        }
      }
    }
  };
});
