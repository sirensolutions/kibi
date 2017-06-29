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
          const sourceScope = $scopes.get(source);
          if (!sourceScope.isDashboard && !sourceScope.isVirtualGroup) {
            const targetScope = $scopes.get(target);
            return !targetScope.isDashboard;
          }
          return true;
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
          $scope.$emit('kibi:dashboardgroup:changed', sourceGroup.id);
          return;
        }
        // Removes a dashboard from one group
        $scope.isSaving = true;
        savedDashboardGroups.get(sourceGroup.id).then(savedSourceGroup => {
          const dashId = savedSourceGroup.dashboards[sourceItem].id;
          savedSourceGroup.dashboards.splice(sourceItem, 1);
          let priority = 0;
          dashboardGroups.getGroups().forEach(group => {
            priority = priority < group.priority ? group.priority : priority;
          });
          return savedSourceGroup.save()
          .then(() => {
            return savedDashboards.get(dashId)
            .then(savedDashboard => {
              savedDashboard.priority = priority + 10;
              return savedDashboard.save();
            });
          });
        })
        .then(cache.invalidate)
        .then(() => {
          $scope.isSaving = false;
          $scope.$emit('kibi:dashboardgroup:changed', sourceGroup.id);
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
          if (sourceItemScope.isDashboard && sourceGroup.id !== targetGroup.id && !sourceGroup.virtual && targetGroup.virtual) {
            // Removes a dashboard from one group and put in the correct order
            return savedDashboardGroups.get(sourceGroup.id).then(savedSourceGroup => {
              const sourceItemId = savedSourceGroup.dashboards[sourceItem].id;
              savedSourceGroup.dashboards.splice(sourceItem, 1);
              return savedSourceGroup.save().then(() => {
                return savedDashboards.get(sourceItemId).then(savedDashboard => {
                  savedDashboard.priority = targetGroup.priority - (sibling ? 5 : -5);
                  return savedDashboard.save();
                });
              });
            });
          }
          else if (sourceGroup.id === targetGroup.id && !sourceGroup.virtual && !targetGroup.virtual) {
            // Changes the dashboard order inside a group
            return savedDashboardGroups.get(sourceGroup.id).then(savedGroup => {
              const dashboard = _.clone(savedGroup.dashboards[sourceItem]);
              if (!sibling) {
                savedGroup.dashboards.splice(sourceItem, 1);
                savedGroup.dashboards.splice(targetItem, 0, dashboard);
              } else {
                savedGroup.dashboards.splice(sourceItem, 1);
                const sibingItem = $scopes.get($(sibling).parent().get(0)).dashboardDraggableItemCtrl.getItem();
                savedGroup.dashboards.splice(sibingItem, 0, dashboard);
              }
              return savedGroup.save();
            });
          }
          else if (sourceItemScope.isDashboard && !targetGroup.virtual) {
            // Moves a dashboard from one group to another
            targetGroup.collapsed = false;
            return savedDashboardGroups.get(sourceGroup.id).then(savedSourceGroup => {
              return savedDashboardGroups.get(targetGroup.id).then(savedTargetGroup => {
                const actions = [];
                const dashboard = _.clone(savedSourceGroup.dashboards[sourceItem]);
                savedSourceGroup.dashboards.splice(sourceItem, 1);
                actions.push(savedSourceGroup.save());
                if (!sibling) {
                  savedTargetGroup.dashboards.splice(targetItem + 1, 0, dashboard);
                } else {
                  const sibingItem = $scopes.get($(sibling).parent().get(0)).dashboardDraggableItemCtrl.getItem();
                  savedTargetGroup.dashboards.splice(sibingItem, 0, dashboard);
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
            targetGroup.collapsed = false;
            return savedDashboardGroups.get(targetGroup.id).then(savedGroup => {
              const dashboard = {
                id: sourceGroup.id,
                title: sourceGroup.title
              };
              if (!sibling) {
                savedGroup.dashboards.splice(targetItem + 1, 0, dashboard);
              } else {
                const sibingItem = $scopes.get($(sibling).parent().get(0)).dashboardDraggableItemCtrl.getItem();
                savedGroup.dashboards.splice(sibingItem, 0, dashboard);
              }
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
          $scope.$emit('kibi:dashboardgroup:changed', sourceGroup.id);
        })
        .catch((reason) => {
          $scope.isSaving = false;
          notify.error(reason);
        });
      }

    }
  };

});
