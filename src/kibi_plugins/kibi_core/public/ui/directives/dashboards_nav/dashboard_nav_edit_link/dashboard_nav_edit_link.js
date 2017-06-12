import 'plugins/kibi_core/saved_objects/dashboard_groups/saved_dashboard_groups';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import jQuery from 'jquery';
import dashboardNavEditLinkTemplate from './dashboard_nav_edit_link.html';
import './dashboard_nav_edit_link.less';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardNavEditLink', ($rootScope, dashboardGroups, createNotifier,
  dashboardsNavState, savedDashboardGroups, Private) => {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      filter: '=',
      group: '='
    },
    template: dashboardNavEditLinkTemplate,
    link: function ($scope, $element) {
      const cache = Private(CacheProvider);
      const notify = createNotifier({
        location: 'Dashboard Groups Editor'
      });

      $scope.editGroup = (event, group) => {
        event.preventDefault();
        dashboardGroups.setGroupSelection(group);
        dashboardsNavState.setGroupEditorOpen(true);
      };

      $scope.deleteGroup = () => {
        const group = $scope.group;
        savedDashboardGroups.delete(group.id)
        .then(cache.invalidate)
        .then(() => {
          notify.info('Dashboard Group ' + group.title + ' was successfuly deleted');
          $rootScope.$emit('kibi:dashboardgroup:changed', group.id);
        })
        .catch (notify.error);
      };

      const groupAnchor = jQuery($element).find('.title');

      $scope.isSidebarOpen = dashboardsNavState.isOpen();
      $scope.$watch(dashboardsNavState.isOpen, isOpen => {
        $scope.isSidebarOpen = isOpen;
      });


      $scope.initQtip = function () {
        groupAnchor.qtip({
          content: {
            title: 'Group',
            text: function () {
              return $scope.group.title;
            }
          },
          position: {
            my: 'left top',
            at: 'right center'
          },
          show: {
            event: 'mouseenter',
            solo: true
          },
          hide: {
            event: 'mouseleave'
          },
          style: {
            classes: 'qtip-light qtip-rounded qtip-shadow'
          }
        });
      };

      $scope.$watchGroup([ 'group.title', 'group.dashboards' ], () => {
        $scope.initQtip();
      });
    }
  };
})
.directive('dashboardNavEditTooltip', function () {
  return {
    scope: {
      dashboard: '='
    },
    link: function ($scope, element, attrs)
     {
      element .qtip({
        content: {
          title: 'Dashboard',
          text: function () {
            return $scope.dashboard.title;
          }
        },
        position: {
          my: 'left top',
          at: 'right center'
        },
        show: {
          event: 'mouseenter',
          solo: true
        },
        hide: {
          event: 'mouseleave'
        },
        style: {
          classes: 'qtip-light qtip-rounded qtip-shadow'
        }
      });
    }
  };
});
