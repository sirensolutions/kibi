import 'ui/kibi/directives/kibi_nav_bar.less';
import 'ui/kibi/directives/kibi_dashboard_toolbar';
import 'ui/kibi/directives/kibi_stop_click_event';
import 'ui/kibi/directives/kibi_menu_template';

import onPage from 'ui/kibi/utils/on_page';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import _ from 'lodash';
import ResizeCheckerProvider from 'ui/vislib/lib/resize_checker';
import KibiNavBarHelperProvider from 'ui/kibi/directives/kibi_nav_bar_helper';
import QueryFilterProvider from 'ui/filter_bar/query_filter';

import navBarTemplate from 'ui/kibi/directives/kibi_nav_bar.html';
import menuTemplateHtml from 'ui/kibi/directives/kibi_menu_template_kibi_nav_bar.html';

uiRoutes
.addSetupWork(function (Private) {
  const kibiNavBarHelper = Private(KibiNavBarHelperProvider);
  return kibiNavBarHelper.init();
});

uiModules
.get('app/dashboard')
.directive('kibiNavBar', function ($rootScope, kibiState, config, Private) {
  const ResizeChecker = Private(ResizeCheckerProvider);
  const kibiNavBarHelper = Private(KibiNavBarHelperProvider);
  const queryFilter = Private(QueryFilterProvider);

  return {
    restrict: 'E',
    // Note: does not require dashboardApp as the kibi-nav-bar is placed outside of dashboardApp
    template: navBarTemplate,
    link: function ($scope, $el) {

      $scope.dashboardSelectData = {
        template: menuTemplateHtml,
        onOpen: function () {
          const activeGroup = _.find($scope.dashboardGroups, g => g.active === true);
          activeGroup.selected.onOpenClose(activeGroup);
        }
      };

      $scope.dashboardGroups = kibiNavBarHelper.getDashboardGroups();

      const removeLocationChangeSuccessHandler = $rootScope.$on('$locationChangeSuccess', function () {
        onPage.onDashboardPage() ? $el.show() : $el.hide();
      });

      $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
      const removeInitConfigHandler = $rootScope.$on('init:config', function () {
        $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
      });

      const removeRelationalPanelHandler = $rootScope.$on('change:config.kibi:relationalPanel', function () {
        $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
      });

      // =============
      // Tab scrolling
      // =============

      let tabContainer = $el.find('.tab-container');
      $scope.tabResizeChecker = new ResizeChecker(tabContainer);
      $scope.tabScrollerState = [true, false];

      const updateTabScroller = function () {
        const sl = tabContainer.scrollLeft();
        $scope.tabScrollerState[0] = sl === 0;
        $scope.tabScrollerState[1] = sl === tabContainer[0].scrollWidth - tabContainer[0].clientWidth;
      };

      $scope.onTabContainerResize = function () {
        $scope.tabScrollerVisible = tabContainer[0].offsetWidth < tabContainer[0].scrollWidth;
        updateTabScroller();
      };

      $scope.tabResizeChecker.on('resize', $scope.onTabContainerResize);

      const amount = 90;
      let stopScrolling = false;

      function scroll(direction, amount) {
        const scrollLeft = tabContainer.scrollLeft() - direction * amount;
        tabContainer.animate({scrollLeft: scrollLeft}, 250, 'linear', function () {
          if (!stopScrolling) {
            scroll(direction, amount * 1.75);
          }
          updateTabScroller();
        });
      }

      $scope.scrollTabs = function (direction) {
        if (direction === false) {
          stopScrolling = true;
          tabContainer.stop();
          updateTabScroller();
          return;
        }
        stopScrolling = false;
        scroll(direction, amount);
        updateTabScroller();
      };

      // rerender tabs if any dashboard got saved
      const removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
        updateTabScroller();
        kibiNavBarHelper.computeDashboardsGroups('Dashboard changed')
        .then(() => kibiNavBarHelper.updateAllCounts([ dashId ], 'kibi:dashboard:changed event'));
      });

      $scope.$watch(function (scope) {
        return kibiState._getCurrentDashboardId();
      }, (currentDashboardId) => {
        if (currentDashboardId) {
          kibiNavBarHelper.computeDashboardsGroups('current dashboard changed');
        }
      });

      const removeDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function () {
        updateTabScroller();
        kibiNavBarHelper.computeDashboardsGroups('Dashboard group changed');
      });

      $scope.$listen(queryFilter, 'update', function () {
        const currentDashboardId = kibiState._getCurrentDashboardId();
        if (currentDashboardId) {
          const dashboardIds = kibiState.addAllConnected(currentDashboardId);
          kibiNavBarHelper.updateAllCounts(dashboardIds, 'filters change');
        }
      });

      $scope.$on('$destroy', function () {
        kibiNavBarHelper.cancelExecutionInProgress();
        removeInitConfigHandler();
        removeRelationalPanelHandler();
        removeDashboardGroupChangedHandler();
        removeDashboardChangedHandler();
        removeLocationChangeSuccessHandler();

        $scope.tabResizeChecker.off('resize', $scope.onTabContainerResize);
        $scope.tabResizeChecker.destroy();
        tabContainer = null;
      });
    }

  };
});
