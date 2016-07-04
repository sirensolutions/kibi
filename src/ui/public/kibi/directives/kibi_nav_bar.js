/*eslint no-use-before-define: 1*/

define(function (require) {

  require('ui/kibi/directives/kibi_nav_bar.less');
  require('ui/kibi/directives/kibi_dashboard_toolbar');
  require('ui/kibi/directives/kibi_stop_click_event');

  var _ = require('lodash');
  const angular = require('angular');

  var app = require('ui/modules').get('app/dashboard');

  app.directive('kibiNavBar', function (
    $location, $rootScope, $http, $timeout, getAppState, globalState, kibiState,
    Promise, config, Private, createNotifier, savedDashboards
  ) {
    var ResizeChecker        = Private(require('ui/vislib/lib/resize_checker'));
    var urlHelper            = Private(require('ui/kibi/helpers/url_helper'));
    var dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
    var indexPath            = Private(require('ui/kibi/components/commons/_index_path'));

    var notify = createNotifier({
      name: 'kibi_nav_bar directive'
    });

    return {
      restrict: 'E',
      // Note: does not require dashboardApp as the st-nav-bar is placed outside of dashboardApp
      scope: {
        chrome: '='
      },
      template: require('ui/kibi/directives/kibi_nav_bar.html'),
      link: function ($scope, $el) {

        const computeDashboardsGroups = function (reason) {
          if (console) {
            console.log('Dashboard Groups will be recomputed because: [' + reason + ']');
          }
          return dashboardGroupHelper.computeGroups().then(function (dashboardGroups) {
            $scope.dashboardGroups = dashboardGroups;
          });
        };

        var lastFiredMultiCountQuery;
        var _fireUpdateAllCounts = function (groupIndexesToUpdate, reason) {
          if (console) {
            console.log('Counts will be updated because: [' + reason + ']');
          }
          var promises  = [];
          if (groupIndexesToUpdate && groupIndexesToUpdate.constructor === Array && groupIndexesToUpdate.length > 0) {
            promises = _.map(groupIndexesToUpdate, function (index) {
              return dashboardGroupHelper.getCountQueryForSelectedDashboard($scope.dashboardGroups, index);
            });
          } else {
            promises = _.map($scope.dashboardGroups, function (g, index) {
              return dashboardGroupHelper.getCountQueryForSelectedDashboard($scope.dashboardGroups, index);
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
                query += '{"index" : "' + indexPath(result.indexPatternId) + '"}\n';
                query += angular.toJson(result.query) + '\n';
                indexesToUpdate.push(index);
              }
            });

            if (query !== '' && lastFiredMultiCountQuery !== query) {
              lastFiredMultiCountQuery = query;

              //Note: ?getCountsOnTabs has no meaning, it is just useful to filter when inspecting requests
              $http.post($scope.chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnTabs', query)
              .then(function (response) {
                if (response.data.responses.length !== indexesToUpdate.length) {
                  notify.warning('The number of counts responses does not match the dashboardGroups which should be updated');
                } else {
                  _.each(response.data.responses, function (hit, i) {
                    // get the coresponding groupIndex from results
                    var tab = $scope.dashboardGroups[results[indexesToUpdate[i]].groupIndex];
                    try {
                      if (!_.contains(Object.keys(hit),'error')) {
                        tab.count = hit.hits.total;
                      } else if (_.contains(Object.keys(hit),'error') &&
                      _.contains(hit.error,'ElasticsearchSecurityException')) {
                        tab.count = 'Unauthorized';
                      } else {
                        tab.count = 'Error';
                      }
                    } catch (e) {
                      notify.warning('An error occurred while getting counts for tab ' + tab.title + ': ' + e);
                    }
                  });
                }
              });

            }
          }).catch(notify.warning);
        };

        var removeLocationChangeSuccessHandler = $rootScope.$on('$locationChangeSuccess', function () {
          $location.path().indexOf('/dashboard') === 0 ? $el.show() : $el.hide();
        });

        $scope.relationalFilterVisible = false;
        var removeInitConfigHandler = $rootScope.$on('init:config', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
        });
        var removeRelationalPanelHandler = $rootScope.$on('change:config.kibi:relationalPanel', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
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

        $scope.$watch(function (scope) {
          return kibiState._getCurrentDashboardId();
        }, (currentDashboardId, oldCurrentDashboardId) => {
          if (currentDashboardId && oldCurrentDashboardId !== currentDashboardId) {
            computeDashboardsGroups('current dashboard changed');
          }
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

        // =================
        // Group computation and counts updates
        // =================

        const getAllDashboards = function () {
          return savedDashboards.find().then(function (hits) {
            return _.filter(hits, function (d) {
              return !!d.savedSearchId;
            });
          });
        };

        const addAllConnected = function (dashboardId) {
          var connected = kibiState._getDashboardsIdInConnectedComponent(dashboardId, kibiState.getEnabledRelations());
          return connected.length > 0 ? connected : [dashboardId];
        };

        const filterSelectedDashboards = function (dashboardsIds) {
          var onlySelectedIds = [];
          _.each(dashboardsIds, function (dashId) {
            _.each($scope.dashboardGroups, function (group) {
              if (group.selected.id === dashId && onlySelectedIds.indexOf(dashId) === -1) {
                onlySelectedIds.push(dashId);
              }
            });
          });
          return onlySelectedIds;
        };

        const getGroupIds = function (dashboardsIds) {
          var groupIds = [];
          _.each(dashboardsIds, function (dashId) {
            _.each($scope.dashboardGroups, function (group) {
              if (group.selected.id === dashId && groupIds.indexOf(group.id) === -1) {
                groupIds.push(group.id);
              }
            });
          });
        };

        // debounce count queries
        var lastEventTimer;
        var updateCounts = function (groupIndexesToUpdate, reason) {
          $timeout.cancel(lastEventTimer);
          lastEventTimer = $timeout(function () {
            _fireUpdateAllCounts(groupIndexesToUpdate, reason);
          }, 750);
        };

        const updateAllCounts = function (dashId, reason) {
          var currentDashboard = kibiState._getCurrentDashboardId();
          if (currentDashboard) {
            if (dashId) {
              updateCounts(
                getGroupIds(
                  filterSelectedDashboards(
                    [dashId]
                  )
                ),
                reason
              );
            } else {
              updateCounts(
                getGroupIds(
                  filterSelectedDashboards(
                    getAllDashboards()
                  )
                ),
                reason
              );
            }
          }
        };

        const updateCountsOnAppStateChange = function (diff) {
          // when appState changed get connected and selected dashboards
          var currentDashboard = kibiState._getCurrentDashboardId();
          if (currentDashboard) {
            updateCounts(
              getGroupIds(
                filterSelectedDashboards(
                  addAllConnected(currentDashboard)
                )
              ),
              'AppState change ' + angular.toJson(diff)
            );
          }
        };

        const updateCountsOnGlobalStateChange = function (diff) {
          // global state keeps pinned filters and default time
          // if any change there update counts on all selected dashboards
          var currentDashboard = kibiState._getCurrentDashboardId();
          if (currentDashboard) {
            updateCounts(
              getGroupIds(
                filterSelectedDashboards(
                  getAllDashboards()
                )
              ),
              'GlobalState change ' + angular.toJson(diff)
            );
          }
        };

        const updateCountsOnKibiStateChange = function (diff) {
          // when kibiState changes get connected and selected dashboards
          var currentDashboard = kibiState._getCurrentDashboardId();
          if (
            currentDashboard &&
            (
              diff.indexOf(kibiState._properties.enabled_relations) !== -1 ||
              diff.indexOf(kibiState._properties.query) !== -1 ||
              diff.indexOf(kibiState._properties.time) !== -1 ||
              diff.indexOf(kibiState._properties.filters) !== -1 ||
              diff.indexOf(kibiState._properties.groups) !== -1
            )
          ) {
            updateCounts(
              getGroupIds(
                filterSelectedDashboards(
                  addAllConnected(currentDashboard)
                )
              ),
              'KibiState change ' + angular.toJson(diff)
            );
          }
        };

        globalState.on('save_with_changes', updateCountsOnGlobalStateChange);
        $scope.$watch(getAppState, function (appState) {
          if (appState) {
            $scope.appState = appState;
            appState.on('save_with_changes', updateCountsOnAppStateChange);
          }
        });
        kibiState.on('save_with_changes', updateCountsOnKibiStateChange);

        var removeDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function () {
          computeDashboardsGroups('Dashboard group changed');
        });

        // everywhere use this event !!! to be consistent
        // make a comment that it was required because not all components can listen to
        // esResponse
        var removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', function (event) {
          updateAllCounts(undefined, 'courier:searchRefresh event');
        });

        // rerender tabs if any dashboard got saved
        var removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
          computeDashboardsGroups('Dashboard changed').then(() => updateAllCounts(dashId, 'kibi:dashboard:changed event'));
        });

        $scope.$on('$destroy', function () {
          removeAutorefreshHandler();
          removeInitConfigHandler();
          removeDashboardGroupChangedHandler();
          removeRelationalFilterPanelClosedHandler();
          removeRelationalPanelHandler();
          removeRouteChangeSuccessHandler();
          removeLocationChangeSuccessHandler();
          removeDashboardChangedHandler();
          removeTabDashboardChangedHandler();
          removeTabDashboardGroupChangedHandler();

          kibiState.off('save_with_changes', updateCountsOnKibiStateChange);
          globalState.off('save_with_changes', updateCountsOnGlobalStateChange);
          if ($scope.appState) {
            $scope.appState.off('save_with_changes', updateCountsOnAppStateChange);
            $scope.appState = null;
          }
          $scope.tabResizeChecker.off('resize', $scope.onTabContainerResize);
          $scope.tabResizeChecker.destroy();
          tabContainer = null;
        });
      }

    };
  });

});
