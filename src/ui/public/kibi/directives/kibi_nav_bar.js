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
  .directive('kibiNavBar', function ($rootScope, kibiState, config, Private, $timeout) {
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

        $scope.splitTabs = config.get('kibi:splitTabs');
        $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
        const removeInitConfigHandler = $rootScope.$on('init:config', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
          $scope.splitTabs = config.get('kibi:splitTabs');
        });

        const removeRelationalPanelHandler = $rootScope.$on('change:config.kibi:relationalPanel', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
        });

        const removeSplitTabsHandler = $rootScope.$on('change:config.kibi:splitTabs', function () {
          $scope.splitTabs = config.get('kibi:splitTabs');
        });

        // =============
        // Tab scrolling
        // =============

        var $tabContainer = $el.find('.tab-container');
        var tabContainerElement = $el[0];

        $scope.tabResizeChecker = new ResizeChecker($tabContainer);
        $scope.tabScrollerState = {
          leftArrow: true,
          rightArrow: false
        };

        var updateTabScroller = function () {
          if (!$tabContainer) {
            return;
          }
          var sl = $tabContainer.scrollLeft();
          const oldArrowLeft = $scope.tabScrollerState.leftArrow;
          const oldArrowRight = $scope.tabScrollerState.rightArrow;
          $scope.tabScrollerState.leftArrow = sl === 0;
          $scope.tabScrollerState.rightArrow = sl === $tabContainer[0].scrollWidth - $tabContainer[0].clientWidth;
          if (
            pressedButtonDirection === 'left' &&
            oldArrowLeft === true &&
            $scope.tabScrollerState.leftArrow === false &&
            $tabContainer.scrollLeft() !== 0
          ) {
            stopScrolling = true;
          }
          if (
            pressedButtonDirection === 'right' &&
            oldArrowRight === true &&
            $scope.tabScrollerState.rightArrow === false
          ) {
            stopScrolling = true;
          }
        };

        function isActiveTabVisible(activeTab) {
          if (activeTab && $tabContainer) {
            const tab = activeTab.getBoundingClientRect();
            return (tab.right > 0) && (tab.left + activeTab.offsetWidth - $tabContainer.width() <= 0);
          }
        };

        function makeVisible() {
          if (!$tabContainer) {
            return;
          }

          const $activeTab = $el.find('.nav-tabs li.active');
          const activeTabElement = $activeTab[0];
          if (!activeTabElement) {
            return;
          }
          if (!isActiveTabVisible(activeTabElement)) {
            $tabContainer.stop(true);
            var tabContainerWidth = $tabContainer.width();
            var activeTabOffsetLeft = $activeTab.offset().left;
            var activeTabWidth = $activeTab.width();
            scroll(-1, activeTabOffsetLeft + activeTabWidth - tabContainerWidth);
          } else {
            updateTabScroller();
          }
        }

        $scope.onTabContainerResize = function () {
          if (!$tabContainer) {
            return;
          }
          $scope.tabScrollerVisible = $tabContainer.width() < tabContainerElement.scrollWidth;
          makeVisible();
        };

        $scope.$watch(($scope) => {
          const countsArray = _($scope.dashboardGroups)
          .map(g => _.pluck(g.dashboards, 'count'))
          .flatten()
          .compact()
          .value();
          return countsArray.length === 0 ? null : countsArray.join();
        }, (counts) => {
          if (counts) {
            $timeout(makeVisible, 250);
          }
        });

        $scope.tabResizeChecker.on('resize', () => {
          $scope.onTabContainerResize();
        });

        var amount = 90;
        var stopScrolling = false;
        var pressedButtonDirection;

        function scrollByButton(direction, amount) {
          pressedButtonDirection = direction === 1 ? 'left' : 'right';
          scroll(direction, amount)
          .then(() => {
            if (!stopScrolling) {
              scrollByButton(direction, amount);
            }
          });
        }

        function scroll(direction, amount) {
          if (!$tabContainer) {
            return Promise.resolve();
          }

          return new Promise((fulfill, reject) => {
            $tabContainer.stop(true);
            var tabContainerScrollLeft = $tabContainer.scrollLeft();
            var scrollLeft =  tabContainerScrollLeft - direction * amount;
            $tabContainer.animate(
              {scrollLeft: scrollLeft},
              {
                duration: 100,
                easing: 'linear',
                complete: () => {
                  updateTabScroller();
                  fulfill();
                },
                fail: (err) => {
                  reject(err);
                }
              }
            );
          });
        }

        // used by the scrolling buttons
        $scope.scrollTabs = function (direction) {
          if (!$tabContainer) {
            return;
          }
          if (direction === false) {
            stopScrolling = true;
            $tabContainer.stop();
            updateTabScroller();
            return;
          }
          stopScrolling = false;
          scrollByButton(direction, amount);
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
          removeSplitTabsHandler();
          removeDashboardGroupChangedHandler();
          removeDashboardChangedHandler();
          removeLocationChangeSuccessHandler();

          $scope.tabResizeChecker.off('resize', $scope.onTabContainerResize);
          $scope.tabResizeChecker.destroy();
          $tabContainer = null;
        });
      }

    };
  });

});
