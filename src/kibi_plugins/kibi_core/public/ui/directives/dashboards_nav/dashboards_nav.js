import angular from 'angular';
import _ from 'lodash';
import './dashboard_switcher';
import './dashboards_nav.less';
import './dashboard_top_toolbar';
import './dashboard_bottom_toolbar';
import './dashboard_nav_group_editor';
import './dashboard_draggable/dashboard_draggable_container';
import './dashboard_draggable/dashboard_draggable_item';
import './dashboard_draggable/dashboard_draggable_handle';
import './new_dashboard_confirm/new_dashboard_confirm_promise';
import dashboardsNavTemplate from './dashboards_nav.html';
import { onDashboardPage } from 'ui/kibi/utils/on_page';
import { DashboardConstants } from 'src/core_plugins/kibana/public/dashboard/dashboard_constants';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import { DashboardViewMode } from 'src/core_plugins/kibana/public/dashboard/dashboard_view_mode';
import { hashedItemStoreSingleton } from 'ui/state_management/state_storage';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardsNav', ($rootScope, dashboardsNavState, globalNavState, createNotifier, dashboardGroups, kbnUrl,
  savedDashboards, Private, kibiState, $document, newDashboardConfirmPromise, $timeout) => {
  return {
    restrict: 'E',
    replace: true,
    scope: true,
    template: dashboardsNavTemplate,
    link: ($scope, $element) => {
      const cache = Private(CacheProvider);
      const notify = createNotifier({
        location: 'Dashboard Groups'
      });

      $scope.bar = $element;
      $scope.slider = $element.find('.dashboards-slider-handle');
      $scope.dashApp = $document.find('.app-container.dashboard-container');
      $scope.links = $element.find('.links');
      $scope.groupEditor = $element.find('.group-editor');

      $scope.resizeParts = (count) => {
        $scope.bar.css('width', count);
        $document.find('.toaster-container .toaster').css('margin-left', count);
        $scope.dashApp.css('margin-left', count);
        $scope.groupEditor.css('margin-left', count);
        $scope.links.css('width', count);
        $scope.slider.css('left', count - 4);
        let parts = $element.find('.title');
        parts.css('width', (((count - 50) / count) * 100).toFixed(2) + '%');
        const value = (((count - 80) / count) * 100).toFixed(2);
        parts = $element.find('.dashboard-nav-title');
        parts.css('width', value + '%');
        parts = $element.find('.dashboard-nav-title-virtual-group');
        parts.css('width', value + '%');
      };

      function updateGlobalNav() {
        $scope.isGlobalNavOpen = globalNavState.isOpen();
      }

      function updateDashboardsNav() {
        const isOpen = dashboardsNavState.isOpen();
        $scope.isDashboardsNavOpen = isOpen;
        $scope.dashboardsNavToggleButton = {
          title: isOpen ? 'Collapse' : 'Expand',
          tooltipContent: isOpen ? 'Collapse dashboards bar' : 'Expand dashboards bar',
          icon: 'plugins/kibana/assets/play-circle.svg'
        };

        const onGroupEditorOpen = dashboardsNavState.isGroupEditorOpen();
        $scope.isDashboardsNavGroupEditorOpen = onGroupEditorOpen;

        // Notify visualizations, e.g. the dashboard, that they should re-render.
        $rootScope.$broadcast('globalNav:update');

        $scope.resizeParts(dashboardsNavState.navWidth());
      }

      updateGlobalNav();
      updateDashboardsNav();

      $scope.toggleDashboardsNav = (event, force) => {
        if (event.target === event.currentTarget || force) {
          event.preventDefault();
          if (dashboardsNavState.isOpen()) {
            dashboardsNavState.setNavWidth($scope.bar.width() - 4);
          }
          dashboardsNavState.setOpen(!dashboardsNavState.isOpen());
          if (!dashboardsNavState.isOpen()) {
            $scope.resizeParts(140);
          } else {
            $scope.resizeParts(dashboardsNavState.navWidth());
          }
        }
      };

      $scope.getLastNewDashboardName = (title) => {
        const regEx = /.*\s#([0-9]*)$/;
        let last = -1;
        dashboardGroups.getGroups().forEach(group => {
          if (!group.virtual && group.dashboards) {
            group.dashboards.forEach(dash => {
              if (dash.title.indexOf(title) === 0) {
                const match = dash.title.match(regEx);
                const matchNumber = match && match.length > 1 ? +match[1] : 0;
                last = last < matchNumber ? matchNumber : last;
              }
            });
          } else if (group.virtual) {
            if (group.title.indexOf(title) === 0) {
              const match = group.title.match(regEx);
              const matchNumber = match && match.length > 1 ? +match[1] : 0;
              last = last < matchNumber ? matchNumber : last;
            }
          }
        });
        return last;
      };

      $scope.createDashboard = () => {
        const baseName = 'New Dashboard';
        const lastCopy = $scope.getLastNewDashboardName(baseName);
        const title = lastCopy < 0 ? baseName : baseName + ' #' + (lastCopy + 1);
        const options = {};
        newDashboardConfirmPromise(title, options)
        .then(resp => {
          let dash;
          $scope.$broadcast('kibi-dashboard-nav-saving', true);
          savedDashboards.get('')
          .then(savedDash => {
            dash = savedDash;
            dash.title = resp.title;
            dash.savedSearchId = resp.savedSearchId;
            return savedDash.save();
          })
          .then(cache.invalidate)
          .then(() => {
            const state = {
              appState: {
                viewMode: DashboardViewMode.EDIT
              }
            };
            hashedItemStoreSingleton.setItem('kibi_appstate_param', JSON.stringify(state));
            $scope.$broadcast('kibi-dashboard-nav-saving', false);
            notify.info('Dashboard was successfuly created');
            $rootScope.$broadcast('kibi:dashboardgroup:changed');
            globalNavState.setOpen(false);
            dashboardGroups.selectDashboard(dash.id);
          })
          .catch (reason => {
            $scope.$broadcast('kibi-dashboard-nav-saving', false);
            notify.error(reason);
          });
        });
      };

      $scope.restoreCollapsedGroupState = () => {
        if (!dashboardsNavState.areCollapsedGroupsSet()) {
          dashboardGroups.getGroups().forEach(group => {
            group.collapsed = true;
          });
        } else {
          const collapsedGroups = dashboardsNavState.collapsedGroups();
          dashboardGroups.getGroups().forEach(group => {
            if (_.indexOf(collapsedGroups, group.id) >= 0) {
              group.collapsed = true;
            }
          });
        }
      };

      $scope.persistCollapsedGroupState = () => {
        const collapsedGroups = [];
        dashboardGroups.getGroups().forEach(group => {
          if (!group.virtual && group.collapsed) {
            collapsedGroups.push(group.id);
          }
        });
        dashboardsNavState.setCollapsedGroups(collapsedGroups);
      };

      $scope.$on('$destroy', () => {
        $timeout(() => {
          $document.find('.toaster-container .toaster').css('margin-left', 0);
        }, 1);
        $scope.persistCollapsedGroupState();
      });

      $scope.getLastNewDashboardGroupName = (title) => {
        const regEx = /.*\s#([0-9]*)$/;
        let last = -1;
        dashboardGroups.getGroups().forEach(group => {
          if (!group.virtual && group.title.indexOf(title) === 0) {
            const match = group.title.match(regEx);
            const matchNumber = match && match.length > 1 ? +match[1] : 0;
            last = last < matchNumber ? matchNumber : last;
          }
        });
        return last;
      };

      $scope.newDashboardGroup = event => {
        event.preventDefault();
        $scope.$broadcast('kibi-dashboard-nav-saving', true);
        const baseName = 'New group';
        const lastCopy = $scope.getLastNewDashboardGroupName(baseName);
        const title = lastCopy < 0 ? baseName : baseName + ' #' + (lastCopy + 1);
        dashboardGroups.newGroup(title).then((groupId) => {
          $scope.$broadcast('kibi-dashboard-nav-saving', false);
          if (groupId) {
            notify.info('New dashboard group was successfuly created');
            $rootScope.$broadcast('kibi:dashboardgroup:changed', groupId);
          }
        })
        .catch (reason => {
          $scope.$broadcast('kibi-dashboard-nav-saving', false);
          notify.error(reason);
        });
      };

      $scope.onClearFilter = () => {
        kibiState.resetFiltersQueriesTimes()
        .then(() => {
          const dashboardIds = _(dashboardGroups.getGroups())
            .filter(g => !g.collapsed || g.virtual)
            .map('dashboards')
            .flatten()
            .map('id')
            .value();
          return dashboardGroups.updateMetadataOfDashboardIds(dashboardIds);
        });
      };

      $scope.dragging = false;

      $scope.startSlide = event => {
      	$document.on('mousemove touchmove', $scope.moveSlide);
        $document.on('mouseup touchend', $scope.stopSlide);
        $scope.dragging = true;
        event.preventDefault();
      };
      $scope.slider.on('mousedown touchstart', $scope.startSlide);

      $scope.moveSlide = event => {
        if ($scope.dragging) {
          const ev = event.originalEvent.changedTouches ? event.originalEvent.changedTouches[0] : event.originalEvent;
          let count = ev.pageX - $scope.bar[0].offsetLeft;
          count = count < 136 ? 140 : count;
          $scope.resizeParts(count);
        }
      };

      $scope.stopSlide = event => {
      	$document.off('mousemove touchmove', $scope.moveSlide);
        $document.off('mouseup touchend', $scope.stopSlide);
        $rootScope.$broadcast('globalNav:update');
        $scope.dragging = false;
        dashboardsNavState.setNavWidth($scope.bar.width() - 4);
        dashboardsNavState.setOpen(true);
      };

      $scope.$on('kibi:dashboardGroups:updated', function () {
        $timeout(() => {
          const width = !dashboardsNavState.isOpen() ? 140 : dashboardsNavState.navWidth();
          $scope.resizeParts(width);
          $scope.restoreCollapsedGroupState();
        }, 500);
      });

      $timeout(() => {
        const width = !dashboardsNavState.isOpen() ? 140 : dashboardsNavState.navWidth();
        $scope.resizeParts(width);
        $scope.links[0].scrollTop = dashboardsNavState.scrollbarPos();
      }, 200);
      $scope.restoreCollapsedGroupState();

      $scope.links.on('scroll', event => {
        dashboardsNavState.setScrollbarPos(event.target.scrollTop);
      });

      $scope.dashboardLoaded = kibiState._getCurrentDashboardId();
      $scope.$watch(kibiState._getCurrentDashboardId, id => {
        $scope.dashboardLoaded = id;
        $timeout(() => {
          if ($scope.dashboardLoaded) {
            const dashboard = $element.find('.active');
            if (dashboard.length > 0) {
              const offset = dashboard.offset().top - dashboardsNavState.scrollbarPos();
              if (offset > window.innerHeight) {
                dashboardsNavState.setScrollbarPos(offset);
                $scope.links[0].scrollTop = dashboardsNavState.scrollbarPos();
              }
            }
          }
        }, 500);
      });

      $rootScope.$on('globalNavState:change', () => {
        updateGlobalNav();
      });

      $rootScope.$on('dashboardsNavState:change', () => {
        updateDashboardsNav();
      });

      $scope.resize = () => {
        const $container = angular.element($element.find('.links')[0]);
        const $navControls = angular.element($element.find('.dashboards-nav-control')[0]);
        if ($navControls) {
          const h = $element.height() - $navControls.height() - 70;
          $container.height(Math.max(20, h));
        }
      };

      // Re-render if the window is resized
      angular.element(window).bind('resize', function () {
        $scope.resize();
      });

      $scope.resize();
    }
  };
});
