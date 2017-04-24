import _ from 'lodash';
import $ from 'jquery';
import dragula from 'dragula';
import uiModules from 'ui/modules';
import CacheProvider from 'ui/kibi/helpers/cache_helper';

uiModules
.get('kibana')
.directive('dashboardDraggableContainer', function ($rootScope, createNotifier,
  Private, dashboardGroups, savedDashboardGroups, savedDashboards) {
  const cache = Private(CacheProvider);
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
    },
    link($scope, $el, attr) {
      const notify = createNotifier({
        location: 'Dashboard Groups Editor'
      });
      const drake = dragula({
        accepts(el, target, source, sibling) {
          const element = $(el).parent().get(0);
          const elementScope = $scopes.get(element);
          const targetScope = $scopes.get(target);
          if (elementScope.isDashboard && targetScope.isDashboard
            && elementScope.dashboardDraggableItemCtrl.getGroup().id === targetScope.dashboardDraggableItemCtrl.getGroup().id) {
            return true;
          }
          return !$scopes.get(target).isDashboard;
        },
        moves(el, source, handle) {
          const itemScope = $scopes.get(source);
          if (!itemScope || !('dashboardDraggableItemCtrl' in itemScope)) {
            return; // only [draggable-item] is draggable
          }
          return true;
        },
        mirrorContainer: $el.parent().get(0),
        removeOnSpill: true
      });

      drake.on('drag', markDragging(true));
      drake.on('dragend', markDragging(false));
      drake.on('remove', remove);
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

      function remove(el, container, source) {
        const sourceItemScope = $scopes.get(source);
        if (!sourceItemScope) return;
        const sourceItem = sourceItemScope.dashboardDraggableItemCtrl.getItem();
        const sourceGroup = sourceItemScope.dashboardDraggableItemCtrl.getGroup();
        if (!sourceItemScope.isDashboard || sourceGroup.virtual) {
          $rootScope.$emit('kibi:dashboardgroup:changed', sourceGroup.id);
          return;
        }
        // Removes a dashboard from one group
        $scope.isSaving = true;
        savedDashboardGroups.get(sourceGroup.id).then(savedSourceGroup => {
          const dashboard = savedSourceGroup.dashboards[sourceItem];
          savedSourceGroup.dashboards.splice(sourceItem, 1);
          return savedSourceGroup.save();
        })
        .then(cache.invalidate)
        .then(() => {
          $scope.isSaving = false;
          notify.info('Dashboard ' + sourceGroup.title + ' was successfuly moved');
          $rootScope.$emit('kibi:dashboardgroup:changed', sourceGroup.id);
        })
        .catch((reason) => {
          $scope.isSaving = false;
          notify.error(reason);
        });
      }

      function drop(el, target, source, sibling) {
        const targetItemScope = $scopes.get(target);
        if (!targetItemScope) return;
        const targetItem = targetItemScope.dashboardDraggableItemCtrl.getItem();
        const targetGroup = targetItemScope.dashboardDraggableItemCtrl.getGroup();

        const sourceItemScope = $scopes.get(source);
        if (!sourceItemScope) return;
        const sourceItem = sourceItemScope.dashboardDraggableItemCtrl.getItem();
        const sourceGroup = sourceItemScope.dashboardDraggableItemCtrl.getGroup();

        $scope.isSaving = true;
        dashboardGroups.renumberGroups().then(() => {
          // Changes the dashboard order inside a group
          if (sourceGroup.id === targetGroup.id) {
            return savedDashboardGroups.get(sourceGroup.id).then(savedGroup => {
              const swap = savedGroup.dashboards[sourceItem];
              savedGroup.dashboards.splice(sourceItem, 1);
              savedGroup.dashboards.splice(targetItem, 0, swap);
              return savedGroup.save();
            });
          }
          else if (sourceItemScope.isDashboard && !targetGroup.virtual) {
            // Moves a dashboard from one group to another
            return savedDashboardGroups.get(sourceGroup.id).then(savedSourceGroup => {
              return savedDashboardGroups.get(targetGroup.id).then(savedTargetGroup => {
                const actions = [];
                const dashboard = savedSourceGroup.dashboards[sourceItem];
                savedSourceGroup.dashboards.splice(sourceItem, 1);
                actions.push(savedSourceGroup.save());
                if (!sibling) {
                  savedTargetGroup.dashboards.push(dashboard);
                } else {
                  savedTargetGroup.dashboards.splice(targetItem, 0, dashboard);
                }
                actions.push(savedTargetGroup.save());
                return Promise.all(actions);
              });
            });
          }
          else if (!sourceItemScope.isDashboard && sourceGroup.virtual && targetGroup.virtual) {
            // Changes the virtual group order
            return savedDashboards.get(sourceGroup.id).then(savedDashboard => {
              savedDashboard.priority = targetGroup.priority - (sibling ? 5 : -5);
              return savedDashboard.save();
            });
          }
          else if (!sourceItemScope.isDashboard && sourceGroup.virtual && !targetGroup.virtual) {
            // Moves a virtual group into a group
            return savedDashboardGroups.get(targetGroup.id).then(savedGroup => {
              savedGroup.dashboards.push({
                id: sourceGroup.id,
                title: sourceGroup.title
              });
              return savedGroup.save();
            });
          }
          else if (!sourceItemScope.isDashboard && !sourceGroup.virtual) {
            // Changes the group order
            return savedDashboardGroups.get(sourceGroup.id).then(savedGroup => {
              savedGroup.priority = targetGroup.priority - (sibling ? 5 : -5);
              return savedGroup.save();
            });
          }
        })
        .then(cache.invalidate)
        .then(() => {
          $scope.isSaving = false;
          notify.info('Dashboard ' + sourceGroup.title + ' was successfuly moved');
          $rootScope.$emit('kibi:dashboardgroup:changed', sourceGroup.id);
        })
        .catch((reason) => {
          $scope.isSaving = false;
          notify.error(reason);
        });
      }

    }
  };

});
