define(function (require) {

  require('css!components/sindicetech/st_nav_bar/styles/st_nav_bar.css');
  require('plugins/dashboard/directives/st_dashboard_toolbar/st_dashboard_toolbar');
  require('components/sindicetech/st_nav_bar/st_stop_click_event');


  var _ = require('lodash');

  var app = require('modules').get('app/dashboard');

  app.directive('stNavBar', function ($rootScope, $http, Promise, config, Private, $timeout, Notifier) {
    var ResizeChecker        = Private(require('components/vislib/lib/resize_checker'));
    var urlHelper            = Private(require('components/sindicetech/urlHelper/urlHelper'));
    var kibiStateHelper      = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    var dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));

    var notify = new Notifier({
      name: 'st_nav_bar component'
    });

    return {
      restrict: 'E',
      // Note: does not require dashboardApp as the st-nav-bar is placed outside of dashboardApp
      template: require('text!components/sindicetech/st_nav_bar/st_nav_bar.html'),
      link: function ($scope, $el) {

        // debounce count queries
        var lastEventTimer;
        var _updateAllCounts = function (groupIndexesToUpdate, reason) {
          $timeout.cancel(lastEventTimer);
          if (!groupIndexesToUpdate) {
            // there are no indexes so it means we have to update all counts
            // in this case fire the query immediately
            _fireUpdateAllCounts(groupIndexesToUpdate, reason);
          } else {
            lastEventTimer = $timeout( function () {
              _fireUpdateAllCounts(groupIndexesToUpdate, reason);
            }, 750);
          }
        };

        var lastFiredMultiCountQuery;

        var _fireUpdateAllCounts = function (groupIndexesToUpdate, reason) {
          if (console) console.log('Counts will be updated because: [' + reason + ']');

          var promises = [];

          if (groupIndexesToUpdate && groupIndexesToUpdate.constructor === Array && groupIndexesToUpdate.length > 0) {
            promises = _.map(groupIndexesToUpdate, function (index) {
              return dashboardGroupHelper.getCountQueryForSelectedDashboard($scope.dashboardGroups, index);
            });
          } else {
            _.each($scope.dashboardGroups, function (g, i) {
              promises.push(dashboardGroupHelper.getCountQueryForSelectedDashboard($scope.dashboardGroups, i));
            });
          }

          Promise.all(promises).then(function (results) {

            // if there is resolved promise with no query property
            // it means that this group has no index attached and should be skipped when updating the group counts
            // so keep track of indexes to know which group counts should be updated
            var indexesToUpdate = [];
            var query = '';

            _.each(results, function (result, index) {
              if (result.query && result.indexPatternId) {
                query += '{"index" : "' + result.indexPatternId + '"}\n';
                query += JSON.stringify(result.query) + '\n';
                indexesToUpdate.push(index);
              }
            });


            if (query !== '' && lastFiredMultiCountQuery !== query) {
              lastFiredMultiCountQuery = query;

              // ?getCountsOnTabs has no meaning, it is just useful to filter when inspecting requests
              $http.post('elasticsearch/_msearch?getCountsOnTabs', query)
              .success(function (data) {
                if (data.responses.length !== indexesToUpdate.length) {
                  notify.warning('The number of counts responses does not match the dashboardGroups which should be updated');
                } else {
                  _.each(data.responses, function (hit, i) {
                    // get the coresponding groupIndex from results
                    $scope.dashboardGroups[results[indexesToUpdate[i]].groupIndex].count = hit.hits.total;
                  });
                }
              });

            }
          }).catch(notify.warning);
        };


        var _writeToScope = function (newDashboardGroups) {
          var changes = dashboardGroupHelper.updateDashboardGroups($scope.dashboardGroups, newDashboardGroups);
          if (changes.replace === true) {
            $scope.dashboardGroups = newDashboardGroups;
          }
          _updateAllCounts(changes.indexes, changes.reasons);
        };


        var removeLocationChangeSuccessHandler = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
          // only if we are on dashboards
          if (urlHelper.isItDashboardUrl()) {
            $el.show();
          } else {
            $el.hide();
            return;
          }

          kibiStateHelper.saveFiltersForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardFilters());
          kibiStateHelper.saveQueryForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardQuery());

          // check that changes on the same dashboard require counts update
          if (urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)) {
            $timeout(function () {
              _updateAllCounts(null, 'locationChangeSuccess');
              dashboardGroupHelper.computeGroups().then(function (dashboardGroups) {
                _writeToScope(dashboardGroups);
              });
            });
          }
        });

        $scope.$on('$routeChangeSuccess', function () {
          dashboardGroupHelper.computeGroups().then(function (dashboardGroups) {
            _writeToScope(dashboardGroups);
          });
        });

        $scope.relationalFilterVisible = false;
        var removeInitConfigHandler = $rootScope.$on('init:config', function () {
          $scope.relationalPanelConfig = config.get('kibi:relationalPanelConfig');
          $scope.relationalFilterVisible = $scope.relationalPanelConfig.enabled;
        });
        var removeRelationalPanelConfigHandler = $rootScope.$on('change:config.kibi:relationalPanelConfig', function () {
          $scope.relationalPanelConfig = config.get('kibi:relationalPanelConfig');
          $scope.relationalFilterVisible = $scope.relationalPanelConfig.enabled;
        });


        var removeDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function () {
          delete $scope.dashboardGroups;
        });


        $scope.relationalFilterPanelOpened = false;

        $scope.openRelationalFilterPanel = function () {
          $scope.relationalFilterPanelOpened = !$scope.relationalFilterPanelOpened;
          $rootScope.$emit('relationalFilterPanelOpened', $scope.relationalFilterPanelOpened);
        };

        var removeRelationalFilterPanelClosedHandler = $rootScope.$on('relationalFilterPanelClosed', function () {
          $scope.relationalFilterPanelOpened = false;
        });

        // close panel when user navigates to a different route
        var removeRouteChangeSuccessHandler = $rootScope.$on('$routeChangeSuccess', function (event, next, prev, err) {
          $scope.relationalFilterPanelOpened = false;
        });

        // rerender tabs if any dashboard got saved
        var removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
          dashboardGroupHelper.computeGroups().then(function (dashboardGroups) {
            _writeToScope(dashboardGroups);
          });
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

        var removeTabDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function (event, id) {
          updateTabScroller();
        });

        var removeTabDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, id) {
          updateTabScroller();
        });

        $scope.onTabContainerResize = function () {
          if (tabContainer[0].offsetWidth < tabContainer[0].scrollWidth) {
            $el.find('.tab-scroller').addClass('visible');
          } else {
            $el.find('.tab-scroller').removeClass('visible');
          }
          updateTabScroller();
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

        $el.on('$destroy', function () {
          removeInitConfigHandler();
          removeDashboardChangedHandler();
          removeDashboardGroupChangedHandler();
          removeRelationalFilterPanelClosedHandler();
          removeRelationalPanelConfigHandler();
          removeRouteChangeSuccessHandler();
          removeLocationChangeSuccessHandler();
          removeTabDashboardChangedHandler();
          removeTabDashboardGroupChangedHandler();

          $scope.tabResizeChecker.off('resize', $scope.onTabContainerResize);
          $scope.tabResizeChecker.destroy();
          tabContainer = null;
        });

      }
    };
  });

});
