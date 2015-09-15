define(function (require) {

  require('css!components/sindicetech/st_nav_bar/styles/st_nav_bar.css');
  require('plugins/dashboard/directives/st_dashboard_toolbar/st_dashboard_toolbar');
  require('components/sindicetech/st_nav_bar/st_stop_click_event');


  var _ = require('lodash');
  var $ = require('jquery');

  var app = require('modules').get('app/dashboard');

  app.directive('stNavBar', function (
                              $rootScope, $http, Promise, config, savedDashboardGroups,
                              savedDashboards, savedSearches, indexPatterns, Private, timefilter, $timeout, Notifier) {

    var ResizeChecker        = Private(require('components/vislib/lib/resize_checker'));
    var urlHelper            = Private(require('components/sindicetech/urlHelper/urlHelper'));
    var kibiStateHelper      = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    var dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));
    var countHelper          = Private(require('components/kibi/count_helper/count_helper'));

    var notify = new Notifier({
      name: 'st_nav_bar component'
    });

    return {
      restrict: 'E',
      // Note: does not require dashboardApp as the st-nav-bar is placed outside of dashboardApp
      template: require('text!components/sindicetech/st_nav_bar/st_nav_bar.html'),
      link: function ($scope, $el) {

        var _getCountQuery = function (groupIndex) {
          var dashboard = $scope.dashboardGroups[groupIndex].selected;

          if (!dashboard || !dashboard.indexPatternId) {
            delete $scope.dashboardGroups[groupIndex].count;
            return Promise.resolve({
              query: undefined,
              indexPatternId: undefined,
              groupIndex: groupIndex
            });
          }

          return new Promise(function (fulfill, reject) {
            countHelper.getCountQueryForDashboardId(dashboard.id).then(function (queryDef) {
              queryDef.groupIndex = groupIndex;
              fulfill(queryDef);
            }).catch(notify.error);
          });
        };


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
          if (console) console.log('_updateAllCounts fired because: [' + reason + ']');

          var promises = [];

          if (groupIndexesToUpdate && groupIndexesToUpdate.constructor === Array && groupIndexesToUpdate.length > 0) {
            promises = _.map(groupIndexesToUpdate, function (index) {
              return _getCountQuery(index);
            });
          } else {
            _.each($scope.dashboardGroups, function (g, i) {
              promises.push(_getCountQuery(i));
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

              // ?getCountsOnTabs has no meanning it is just usefull to filter when inspecting requests
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
          }).catch(function (err) {
            notify.warning(err);
          });
        };


        var _writeToScope = function (newDashboardGroups) {
          if (!$scope.dashboardGroups) {
            $scope.dashboardGroups = newDashboardGroups;
            _updateAllCounts(null, 'dashboardsGroups not in scope');
            return;
          }

          // There is already a $scope.dashboardGroups
          // lets compare with the new one and update only if necessary
          if ($scope.dashboardGroups.length !== newDashboardGroups.length) {
            $scope.dashboardGroups = newDashboardGroups;
            _updateAllCounts(null, 'dashboardsGroups length not the same');
            return;
          }

          // here first collect the group indexes to update counts
          var groupIndexesToUpdateCountsOn = [];
          for (var gIndex = 0; gIndex < newDashboardGroups.length; gIndex++) {
            var g = newDashboardGroups[gIndex];
            // if not the same group replace
            if ($scope.dashboardGroups[gIndex].title !== g.title) {
              $scope.dashboardGroups[gIndex] = g;
              if (groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
                groupIndexesToUpdateCountsOn.push(gIndex);
              }
              continue;
            } else {
              // the same group lets compare more
              if ($scope.dashboardGroups[gIndex].dashboards.length !== g.dashboards.length) {
                $scope.dashboardGroups[gIndex] = g;
                if (groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
                  groupIndexesToUpdateCountsOn.push(gIndex);
                }
                continue;
              }

              if ($scope.dashboardGroups[gIndex].active !== g.active) {
                $scope.dashboardGroups[gIndex].active = g.active;
              }

              if ($scope.dashboardGroups[gIndex].iconCss !== g.iconCss) {
                $scope.dashboardGroups[gIndex].iconCss = g.iconCss;
              }

              if ($scope.dashboardGroups[gIndex].iconUrl !== g.iconUrl) {
                $scope.dashboardGroups[gIndex].iconUrl = g.iconUrl;
              }
              // selected is tricky as it will be changed by the select input element
              // so instead compare with _selected
              if ($scope.dashboardGroups[gIndex]._selected.id !== g._selected.id) {

                // put the old count first so in case it will be the same it will not flip
                g.count = $scope.dashboardGroups[gIndex].count;

                // here write the whole group to the scope as
                // selected must be a proper reference to the correct object in dashboards array
                $scope.dashboardGroups[gIndex] = g;
                if (groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
                  groupIndexesToUpdateCountsOn.push(gIndex);
                }
              }
              // now compare each dashboard
              var updateCount = false;
              for (var dIndex = 0; dIndex < $scope.dashboardGroups[gIndex].dashboards.length; dIndex++) {
                var d = newDashboardGroups[gIndex].dashboards[dIndex];

                // first check that the number of filters changed on selected dashboard
                if ($scope.dashboardGroups[gIndex].selected.id === d.id &&
                    !_.isEqual($scope.dashboardGroups[gIndex].dashboards[dIndex].filters, d.filters, true)
                ) {
                  $scope.dashboardGroups[gIndex].dashboards[dIndex].filters = d.filters;
                  updateCount = true;
                }

                if ($scope.dashboardGroups[gIndex].selected.id === d.id &&
                    $scope.dashboardGroups[gIndex].dashboards[dIndex].indexPatternId !== d.indexPatternId
                ) {
                  $scope.dashboardGroups[gIndex].dashboards[dIndex].indexPatternId = d.indexPatternId;
                  updateCount = true;
                }

                // then if it is not the same dashboard on the same position
                if ($scope.dashboardGroups[gIndex].dashboards[dIndex].id !== d.id) {
                  $scope.dashboardGroups[gIndex].dashboards[dIndex] = d;
                  updateCount = true;
                }

                if ($scope.dashboardGroups[gIndex].dashboards[dIndex].savedSearchId !== d.savedSearchId) {
                  $scope.dashboardGroups[gIndex].dashboards[dIndex] = d;
                  updateCount = true;
                }
              }
              if (updateCount && groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
                groupIndexesToUpdateCountsOn.push(gIndex);
              }
            }
          }

          //  now update all collected counts
          if ( groupIndexesToUpdateCountsOn.length > 0) {
            _updateAllCounts(groupIndexesToUpdateCountsOn, 'Collected inside writeToScope method');
          }
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

          // here update counts only when filters or query changed
          // on the same dashboard
          var newPath = urlHelper.getPathnameFromUrl(newUrl);
          var oldPath = urlHelper.getPathnameFromUrl(oldUrl);

          var newFilters = urlHelper.getLocalParamFromUrl(newUrl, 'filters');
          var oldFilters = urlHelper.getLocalParamFromUrl(oldUrl, 'filters');
          var newQuery = urlHelper.getLocalParamFromUrl(newUrl, 'query');
          var oldQuery = urlHelper.getLocalParamFromUrl(oldUrl, 'query');

          var newGlobalFilters = urlHelper.getGlobalParamFromUrl(newUrl, 'filters');
          var oldGlobalFilters = urlHelper.getGlobalParamFromUrl(oldUrl, 'filters');
          var newGlobalTime = urlHelper.getGlobalParamFromUrl(newUrl, 'time');
          var oldGlobalTime = urlHelper.getGlobalParamFromUrl(oldUrl, 'time');

          if (newPath === oldPath &&
              ( !_.isEqual(newFilters, oldFilters, true) ||
                !_.isEqual(newQuery, oldQuery, true) ||
                !_.isEqual(newGlobalFilters, oldGlobalFilters, true) ||
                !_.isEqual(newGlobalTime, oldGlobalTime, true)
              )
          ) {
            _updateAllCounts(null, 'locationChangeSuccess');
            dashboardGroupHelper.computeGroups().then(function (dashboardGroups) {
              _writeToScope(dashboardGroups);
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


        $rootScope.$on('kibi:dashboardgroup:changed', function (event, dashboardGroup) {
          // clear the scope in case a group was saved
          // in this way the new computed groups will be used
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
