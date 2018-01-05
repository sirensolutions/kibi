import { uiModules } from 'ui/modules';
import _ from 'lodash';
import './entity_select.less';
import EntitySelectTemplate from './entity_select.html';


uiModules.get('kibana')
.directive('entitySelect', function () {

  return {
    template: EntitySelectTemplate,
    restrict: 'E',
    scope: {
      selected: '=',
      entityType: '@' // INDEX_PATTERN/VIRTUAL_ENTITY/ALL
    },
    link($scope, $element, attrs) {
      $scope.showNav = false;

      $scope.toggleDropDown = function () {
        $scope.showNav = !$scope.showNav;
      };

      $scope.$watch('selected', (newSelected) => {
        if (newSelected) {
          $scope.selectedEntity = { id: newSelected };
          $scope.showNav = false;
        }
      });

      $scope.$watch('selectedEntity', (newSelectedEntity) => {
        if (newSelectedEntity) {
          $scope.selected = newSelectedEntity.id;
          $scope.showNav = false;
        }
      });
    }
  };
});
