import $ from 'jquery';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardDraggableItem', function () {
  return {
    restrict: 'A',
    require: '^dashboardDraggableContainer',
    scope: true,
    controllerAs: 'dashboardDraggableItemCtrl',
    controller($scope, $attrs, $parse) {
      const dragHandles = $();

      this.getItem = () => $parse($attrs.dashboardDraggableItem)($scope);
      this.registerHandle = $el => {
        dragHandles.push(...$el);
      };
    },
    link($scope, $el, attr, draggableController) {
      $scope.isDashboard = attr.dashboardDraggableItem === 'dashboard';
      draggableController.linkDraggableItem($el.get(0), $scope);
    }
  };
});
