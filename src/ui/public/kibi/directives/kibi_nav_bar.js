/*eslint no-use-before-define: 1*/

define(function (require) {

  require('ui/kibi/directives/kibi_nav_bar.less');
  require('ui/kibi/directives/kibi_dashboard_toolbar');
  require('ui/kibi/directives/kibi_stop_click_event');

  var _ = require('lodash');

  var app = require('ui/modules').get('app/dashboard');

  app.directive('kibiNavBar', function (kibiState, $rootScope, $http, Promise, config, Private, $timeout, createNotifier) {
    var ResizeChecker        = Private(require('ui/vislib/lib/resize_checker'));
    var urlHelper            = Private(require('ui/kibi/helpers/url_helper'));
    var kibiStateHelper      = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
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

        var lastFiredMultiCountQuery;
        var _fireUpdateAllCounts = function (groupIndexesToUpdate, reason) {
          if (console) console.log('Counts will be updated because: [' + reason + ']');

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
                query += JSON.stringify(result.query) + '\n';
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


        // debounce count queries
        var lastEventTimer;
        var _updateAllCounts = function (groupIndexesToUpdate, reason) {
          if ($el.css('display') === 'none') {
            return;
          }

          $timeout.cancel(lastEventTimer);
          if (!groupIndexesToUpdate) {
            // there are no indexes so it means we have to update all counts
            // in this case fire the query immediately
            _fireUpdateAllCounts(groupIndexesToUpdate, reason);
          } else {
            lastEventTimer = $timeout(function () {
              _fireUpdateAllCounts(groupIndexesToUpdate, reason);
            }, 750);
          }
        };

        const updateCounts = function () {
          return dashboardGroupHelper.computeGroups().then(function (newDashboardGroups) {
            if (!$scope.dashboardGroups) {
              $scope.dashboardGroups = newDashboardGroups;
              _updateAllCounts(null, [ 'oldDashboardsGroups was undefined' ]);
            } else if ($scope.dashboardGroups.length !== newDashboardGroups.length) {
              $scope.dashboardGroups = newDashboardGroups;
              _updateAllCounts(null, [ 'dashboardsGroups length not the same' ]);
            } else {
              var changes = dashboardGroupHelper.updateDashboardGroups($scope.dashboardGroups, newDashboardGroups);
              _updateAllCounts(changes.indexes, changes.reasons);
            }
          });
        };

        var removeLocationChangeSuccessHandler = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
          // only if we are on dashboards
          if (urlHelper.isItDashboardUrl()) {
            $el.show();
          } else {
            $el.hide();
            return;
          }

          const currentDashboardId = urlHelper.getCurrentDashboardId();
          kibiStateHelper.saveFiltersForDashboardId(currentDashboardId, urlHelper.getDashboardFilters(currentDashboardId));
          kibiStateHelper.saveQueryForDashboardId(currentDashboardId, urlHelper.getDashboardQuery(currentDashboardId));

          // check that changes on the same dashboard require counts update
          if (urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)) {
            $timeout(function () {
              updateCounts();
            });
          }
        });

        $scope.$on('$routeChangeSuccess', function () {
          updateCounts();
        });

        $scope.relationalFilterVisible = false;
        var removeInitConfigHandler = $rootScope.$on('init:config', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
        });
        var removeRelationalPanelHandler = $rootScope.$on('change:config.kibi:relationalPanel', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
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
          updateCounts();
        });
        // everywhere use this event !!! to be consistent
        // make a comment that it was required because not all compononts can listen to
        // esResponse
        var removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', function (event) {
          updateCounts();
        });

        const updateCountsOnSave = function (diff) {
          if (diff.indexOf(kibiState._properties.enabled_relations) !== -1 ||
              diff.indexOf(kibiState._properties.query) !== -1 ||
              diff.indexOf(kibiState._properties.time) !== -1 ||
              diff.indexOf(kibiState._properties.filters) !== -1) {
            updateCounts();
          }
        };
        kibiState.on('save_with_changes', updateCountsOnSave);

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
          kibiState.off('save_with_changes', updateCountsOnSave);

          $scope.tabResizeChecker.off('resize', $scope.onTabContainerResize);
          $scope.tabResizeChecker.destroy();
          tabContainer = null;
        });

      }
    };
  });

});
