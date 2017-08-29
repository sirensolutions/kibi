import $ from 'jquery';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardDummyContainer', function () {
  return {
    restrict: 'A',
    require: '^dashboardDraggableContainer',
    scope: true,
    controllerAs: 'dashboardDraggableItemCtrl',
    controller($scope, $attrs, $parse) {
      this.getItem = () => $parse($attrs.dashboardDummyContainer)($scope);
      this.getGroup = () => $scope.group;
      this.getState = () => $parse($attrs.state)($scope);
    },
    link($scope, $el, attr, draggableController) {
      $scope.isDummy = true;
      $scope.isDashboard = attr.dashboardDraggableItem !== 'group';
      $scope.isVirtualGroup = $scope.group.virtual;
      draggableController.linkContainer($el.get(0), $scope);
    }
  };
});
