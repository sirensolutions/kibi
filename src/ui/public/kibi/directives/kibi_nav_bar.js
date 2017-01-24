/*eslint no-use-before-define: 1*/
define(function (require) {
  require('ui/kibi/directives/kibi_nav_bar.less');
  require('ui/kibi/directives/kibi_dashboard_toolbar');
  require('ui/kibi/directives/kibi_stop_click_event');
  require('ui/kibi/directives/kibi_menu_template');
  const _ = require('lodash');
  const menuTemplateHtml = require('ui/kibi/directives/kibi_menu_template_kibi_nav_bar.html');

  require('ui/routes')
  .addSetupWork(function (Private) {
    const kibiNavBarHelper = Private(require('ui/kibi/directives/kibi_nav_bar_helper'));
    return kibiNavBarHelper.init();
  });

  require('ui/modules')
  .get('app/dashboard')
  .directive('kibiNavBar', function ($rootScope, kibiState, config, Private) {
    const chrome = require('ui/chrome');
    const ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
    const kibiNavBarHelper = Private(require('ui/kibi/directives/kibi_nav_bar_helper'));
    const queryFilter = Private(require('ui/filter_bar/query_filter'));

    return {
      restrict: 'E',
      // Note: does not require dashboardApp as the st-nav-bar is placed outside of dashboardApp
      template: require('ui/kibi/directives/kibi_nav_bar.html'),
      link: function ($scope, $el) {

        $scope.dashboardSelectData = {
          template: menuTemplateHtml,
          onOpen: function () {
            var activeGroup = _.find($scope.dashboardGroups, g => g.active === true);
            activeGroup.selected.onOpenClose(activeGroup);
          }
        };

        $scope.dashboardGroups = kibiNavBarHelper.getDashboardGroups();

        var removeLocationChangeSuccessHandler = $rootScope.$on('$locationChangeSuccess', function () {
          chrome.onDashboardTab() ? $el.show() : $el.hide();
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

        var tabContainer = $el.find('.tab-container');
        $scope.tabResizeChecker = new ResizeChecker(tabContainer);
        $scope.tabScrollerState = [true, false];

        var updateTabScroller = function () {
          var sl = tabContainer.scrollLeft();
          $scope.tabScrollerState[0] = sl === 0;
          $scope.tabScrollerState[1] = sl === tabContainer[0].scrollWidth - tabContainer[0].clientWidth;
        };

        function isActiveTabVisible(activeTab) {
          if (activeTab !== null) {
            var tab = activeTab.getBoundingClientRect();
            return !(tab.right < 0) && !(tab.left - tabContainer[0].offsetWidth >= 0);
          }
        };

        $scope.onTabContainerResize = function () {
          $scope.tabScrollerVisible = tabContainer[0].offsetWidth < tabContainer[0].scrollWidth;
          updateTabScroller();
          let test = $el.find('.nav-tabs li.active');
          if (!isActiveTabVisible($el.find('.nav-tabs li.active')[0])) {
            $scope.scrollTabs(-1);
          }
        };

        $scope.tabResizeChecker.on('resize', $scope.onTabContainerResize);

        var amount = 90;
        var stopScrolling = false;

        function scroll(direction, amount) {
          var scrollLeft = tabContainer.scrollLeft() - direction * amount;
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
        var removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
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

        var removeDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function () {
          updateTabScroller();
          kibiNavBarHelper.computeDashboardsGroups('Dashboard group changed');
        });

        $scope.$listen(queryFilter, 'update', function () {
          let currentDashboardId = kibiState._getCurrentDashboardId();
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

});
