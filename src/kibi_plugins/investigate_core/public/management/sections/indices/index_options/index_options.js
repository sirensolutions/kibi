import _ from 'lodash';
import { uiModules } from 'ui/modules';
import indexOptionsTemplate from './index_options.html';
import './index_options.less';


uiModules.get('apps/management')
.directive('indexOptions', function (ontologyClient, kbnUrl) {
  return {
    restrict: 'E',
    template: indexOptionsTemplate,
    scope: {
      entity: '=',
      save: '='
    },
    link: function ($scope) {
      $scope.save = function () {
        let promise;
        if ($scope.entity.type === 'VIRTUAL_ENTITY') {
          promise = ontologyClient.updateEntity($scope.entity);
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
          if ($scope.entity.instanceLabel.type) {
            entity.instanceLabelType = $scope.entity.instanceLabel.type;
          }
          if ($scope.entity.instanceLabel.value) {
            entity.instanceLabelValue = $scope.entity.instanceLabel.value;
          }
          promise = ontologyClient.updateEntity(entity);
        }

        return Promise.resolve(promise)
        .then(() => {
          kbnUrl.change('/management/siren/entities/' + $scope.entity.id);
        });
      };
    }
  };
});
