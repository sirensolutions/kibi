import dashboardNavLinkTemplate from './dashboard_nav_link.html';
import './dashboard_nav_link.less';
import uiModules from 'ui/modules';
import groupMenuTemplate from 'ui/kibi/directives/kibi_menu_template_kibi_nav_bar.html';
import _ from 'lodash';

uiModules
.get('kibana')
.directive('dashboardNavLink', (dashboardGroups, kibiState, dashboardsNavState, createNotifier) => {
  const numeral = require('numeral')();

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      filter: '=',
      group: '='
    },
    template: dashboardNavLinkTemplate,
    link: function ($scope) {
      const notify = createNotifier({
        location: 'Dashboard Navigator'
      });
      $scope.groupMenuTemplate = groupMenuTemplate;
      $scope.groupMenuLocals = {
        filter: $scope.filter,
        groupId: $scope.group.id,
        dashboardGroups
      };

      $scope.selectDashboard = () => {
        if (!$scope.group.selected) {
          notify.error(`The group ${$scope.group.title} doesn't contains any dashboard.`);
        } else {
          dashboardGroups.selectDashboard($scope.group.selected.id);
        }
      };

      $scope.isSidebarOpen = dashboardsNavState.isOpen();
      $scope.$watch(dashboardsNavState.isOpen, isOpen => {
        $scope.isSidebarOpen = isOpen;
      });

      $scope.toggleGroupNav = function () {
        dashboardGroups.updateMetadataOfGroupId($scope.group.id);
      };

      $scope.doesGroupHasAnyHiglightedDashboard = function (dashboards) {
        // here iterate over dashboards check if highlighted dashboard exists
        for (let i = 0; i < dashboards.length; i++) {
          if (dashboards[i].$$highlight === true) {
            return true;
          }
        }
        return false;
      };

      $scope.$watchGroup([ 'group.selected.title', 'group.selected.count' ], () => {
        delete $scope.countHumanNotation;
        $scope.tooltipContent = $scope.group.title;
        if ($scope.group.dashboards.length > 1) {
          $scope.tooltipContent += ` (${$scope.group.selected.title})`;
        }
        if ($scope.group.selected && $scope.group.selected.count !== undefined) {
          try {
            $scope.countHumanNotation = numeral.set($scope.group.selected.count).format('0.[00]a');
          } catch (err) {
            // count may not a number, e.g., it can be Forbidden
            $scope.countHumanNotation = $scope.group.selected.count;
          }
          $scope.tooltipContent += ` (${$scope.group.selected.count})`;
        }
      });

      $scope.isDashboardLoaded = Boolean(kibiState._getCurrentDashboardId());
      $scope.$watch(kibiState._getCurrentDashboardId, id => {
        $scope.isDashboardLoaded = Boolean(id);
      });
    }
  };
});
