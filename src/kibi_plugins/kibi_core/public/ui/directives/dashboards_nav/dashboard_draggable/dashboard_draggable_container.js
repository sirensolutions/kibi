import _ from 'lodash';
import $ from 'jquery';
import dragula from 'dragula';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardDraggableContainer', function () {

  const $scopes = new WeakMap();

  return {
    restrict: 'A',
    scope: true,
    controllerAs: 'dashboardDraggableContainerCtrl',
    controller($scope, $attrs, $parse, $element) {
      $scopes.set($element.get(0), $scope);
      this.linkDraggableItem = (el, $itemScope) => {
        const element = $(el).parent().get(0);
        $scope.drake.containers.push(element);
        $scopes.set(element, $itemScope);
      };

      this.getList = () => _.sortBy($parse($attrs.dashboardDraggableContainer)($scope), 'priority');
    },
    link($scope, $el, attr) {
      const drake = dragula({
        accepts(el, target, source, sibling) {
          const element = $(el).parent().get(0);
          if ($scopes.get(element).isDashboard) {
            return $scopes.get(target).isDashboard;
          } else {
            return !$scopes.get(target).isDashboard;
          }
        },
        moves(el, source, handle) {
          const itemScope = $scopes.get(source);
          if (!itemScope || !('dashboardDraggableItemCtrl' in itemScope)) {
            return; // only [draggable-item] is draggable
          }
          return true;
        },
        mirrorContainer: $el.parent().get(0)
      });

      const drakeEvents = [
        'cancel',
        'cloned',
        'drag',
        'dragend',
        'drop',
        'out',
        'over',
        'remove',
        'shadow'
      ];
      const prettifiedDrakeEvents = {
        drag: 'start',
        dragend: 'end'
      };

      // drakeEvents.forEach(type => {
      //   drake.on(type, (el, ...args) => forwardEvent(type, el, ...args));
      // });
      drake.on('drag', markDragging(true));
      drake.on('dragend', markDragging(false));
      drake.on('drop', drop);
      $scope.$on('$destroy', drake.destroy);
      $scope.drake = drake;

      function markDragging(isDragging) {
        return el => {
          const scope = $scopes.get($(el).parent().get(0));
          if (!scope) return;
          scope.isDragging = isDragging;
          scope.$apply();
        };
      }

      // function forwardEvent(type, el, ...args) {
      //   const name = `drag-${prettifiedDrakeEvents[type] || type}`;
      //   const element = $(el).parent.get(0);
      //   const scope = $scopes.get(element);
      //   if (!scope) return;
      //   scope.$broadcast(name, element, ...args);
      // }

      function drop(el, target, source, sibling) {
        // console.log('drop', el, target, source, sibling);
        const list = $scope.dashboardDraggableContainerCtrl.getList();
        const itemScope = $scopes.get(source);
        if (!itemScope) return;
        const item = itemScope.dashboardDraggableItemCtrl.getItem();
        const fromIndex = list.indexOf(item);
        const siblingIndex = getItemIndexFromElement(list, $(sibling).parent().get(0));

        const toIndex = getTargetIndex(list, fromIndex, siblingIndex);
        // _.move(list, item, toIndex);
        // console.log(list, item, toIndex);
      }

      function getTargetIndex(list, fromIndex, siblingIndex) {
        if (siblingIndex === -1) {
          // means the item was dropped at the end of the list
          return list.length - 1;
        } else if (fromIndex < siblingIndex) {
          // An item moving from a lower index to a higher index will offset the
          // index of the earlier items by one.
          return siblingIndex - 1;
        }
        return siblingIndex;
      }

      function getItemIndexFromElement(list, element) {
        if (!element) return -1;

        const scope = $scopes.get(element);
        if (!scope) return;
        const item = scope.dashboardDraggableItemCtrl.getItem();
        const index = list.indexOf(item);

        return index;
      }
    }
  };

});
