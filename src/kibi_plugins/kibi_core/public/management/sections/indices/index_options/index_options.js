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
        console.log('UPDATING NEW OPTIONS');
        // if ($scope.entity.type === 'INDEX_PATTERN') {
        //   return $scope.entity.save()
        //   .then(() => {
        //     return ontologyClient.updateEntity($scope.entity);
        //   });
        // } else if ($scope.indexPattern) {
        //   return ontologyClient.updateEntity($scope.entity);
        // }
      }
    }
  };
});
