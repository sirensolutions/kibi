import $ from 'jquery';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardDraggableItem', function () {
  return {
    restrict: 'A',
    require: '^dashboardDraggableContainer',
    scope: true,
    controllerAs: 'dashboardDraggableItemCtrl',
    controller($scope, $attrs, $parse) {
      this.getItem = () => $parse($attrs.dashboardDraggableItem)($scope);
      this.getGroup = () => $scope.group;
      this.getState = () => $parse($attrs.state)($scope);
    },
    link($scope, $el, attr, draggableController) {
      $scope.isDashboard = attr.dashboardDraggableItem !== 'group';
      $scope.isVirtualGroup = $scope.group.virtual;
      draggableController.linkDraggableItem($el.get(0), $scope);
    }
  };
});
