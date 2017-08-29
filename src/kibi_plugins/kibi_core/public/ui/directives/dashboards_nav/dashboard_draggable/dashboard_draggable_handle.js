import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardDraggableHandle', function () {
  return {
    restrict: 'A',
    require: '^dashboardDraggableItem',
    link($scope, $el, attr, ctrl) {
      $el.addClass('gu-handle');
    }
  };
});
