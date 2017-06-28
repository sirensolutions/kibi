import 'plugins/kibi_core/saved_objects/dashboard_groups/saved_dashboard_groups';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import jQuery from 'jquery';
import _ from 'lodash';
import dashboardNavEditLinkTemplate from './dashboard_nav_edit_link.html';
import './dashboard_nav_edit_link.less';
import 'ui/kibi/directives/kibi_context_menu';
import DashboardStateProvider from 'src/core_plugins/kibana/public/dashboard/dashboard_state';
import { DashboardViewMode } from 'src/core_plugins/kibana/public/dashboard/dashboard_view_mode';
import { DashboardConstants } from 'src/core_plugins/kibana/public/dashboard/dashboard_constants';
import { hashedItemStoreSingleton } from 'ui/state_management/state_storage';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardNavEditLink', ($rootScope, dashboardGroups, createNotifier,
  dashboardsNavState, savedDashboardGroups, Private, globalNavState, kibiState, AppState,
  savedDashboards, kbnUrl, confirmModalPromise, $timeout) => {
  const numeral = require('numeral')();

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
        location: 'Dashboard Navigator'
      });

      const contextMenu = [{
        id: 'edit',
        name: 'Edit',
        topNavKey: null
      }, {
        id: 'rename',
        name: 'Rename',
        topNavKey: 'save'
      }, {
        id: 'clone',
        name: 'Clone'
      }, {
        id: 'options',
        name: 'Options',
        topNavKey: 'options'
      }, {
        type: 'hr'
      }, {
        id: 'delete',
        name: 'Delete'
      }];

      $scope.menuActionTriggered = false;

      if (!$scope.group.virtual) {
        $scope.contextMenuGroup = contextMenu.filter(menu => {
          return _.indexOf(['rename', 'clone', 'options'], menu.id) < 0;
        });
      } else {
        $scope.contextMenuVirtualGroup = contextMenu;
      }
      $scope.contextMenuDashboard = contextMenu;

      $scope.clickMenuGroup = function (item) {
        $scope.menuActionTriggered = item;
        if (item.id === 'edit') {
          dashboardGroups.setGroupSelection($scope.group);
          dashboardsNavState.setGroupEditorOpen(true);
        } else if (item.id === 'delete') {
          $scope.deleteGroup();
        }
      };

      $scope.clickMenuVirtualGroup = function (item) {
        $scope.menuActionTriggered = item;
        if (item.id === 'delete') {
          $scope.deleteDashboard($scope.group.id, $scope.group.title);
        } else if (item.id === 'clone') {
          $scope.cloneDashboard($scope.group.id);
        } else {
          $scope.editDashboard($scope.group.id, item);
        }
      };

      $scope.clickMenuDashboard = function (item, dashboard) {
        $scope.menuActionTriggered = item;
        if (item.id === 'delete') {
          $scope.deleteDashboard(dashboard.id, dashboard.title);
        } else if (item.id === 'clone') {
          $scope.cloneDashboard(dashboard.id);
        } else {
          $scope.editDashboard(dashboard.id, item);
        }
      };

      $scope.selectDashboard = index => {
        if ($scope.menuActionTriggered) {
          $scope.menuActionTriggered = false;
          return;
        }
        if (index >= 0 || $scope.group.virtual) {
          let id;
          if (index >= 0) {
            id = $scope.group.dashboards[index].id;
          } else {
            id = $scope.group.id;
          }
          $scope.$emit('kibi-dashboard-nav-saving', true);
          globalNavState.setOpen(false);
          dashboardGroups.selectDashboard(id);
          return;
        }
        $scope.group.collapsed = !$scope.group.collapsed;
        if (!$scope.group.collapsed) {
          const dashboardIds = _($scope.group.dashboards).filter(d => !d.count).map('id').value();
          if (dashboardIds.length > 0) {
            dashboardGroups.updateMetadataOfDashboardIds(dashboardIds);
          }
        }
      };

      $scope.dashboardLoaded = kibiState._getCurrentDashboardId();
      $scope.$watch(kibiState._getCurrentDashboardId, id => {
        $scope.dashboardLoaded = id;
        $timeout(() => {
          $scope.$emit('kibi-dashboard-nav-saving', false);
        }, 1000);
      });

      $scope.getLastClonedDashboardName = (title) => {
        const regEx = /.*\scopy\s#([0-9]*)$/;
        let last = 0;
        dashboardGroups.getGroups().forEach(group => {
          if (!group.virtual && group.dashboards) {
            group.dashboards.forEach(dash => {
              if (dash.title.indexOf(title + ' copy #') === 0) {
                const match = dash.title.match(regEx);
                const matchNumber = match && match.length > 1 ? +match[1] : 0;
                last = last < matchNumber ? matchNumber : last;
              }
            });
          } else if (group.virtual) {
            if (group.title.indexOf(title + ' copy #') === 0) {
              const match = group.title.match(regEx);
              const matchNumber = match && match.length > 1 ? +match[1] : 0;
              last = last < matchNumber ? matchNumber : last;
            }
          }
        });
        return last;
      };

      $scope.cloneDashboard = (id) => {
        let title;
        $scope.$emit('kibi-dashboard-nav-saving', true);
        savedDashboards.get(id)
        .then(savedDash => {
          savedDash.copyOnSave = true;
          title = savedDash.title;
          const baseTitle = savedDash.title.replace(/\scopy\s#[0-9]*$/, '');
          const lastCopy = $scope.getLastClonedDashboardName(baseTitle);
          savedDash.title = baseTitle + ' copy #' + (lastCopy + 1);
          return savedDash.save();
        })
        .then(cache.invalidate)
        .then(() => {
          $scope.$emit('kibi-dashboard-nav-saving', false);
          notify.info('Dashboard ' + title + ' was successfuly cloned');
          $scope.$emit('kibi:dashboardgroup:changed', id);
        })
        .catch (reason => {
          $scope.$emit('kibi-dashboard-nav-saving', false);
          notify.error(reason);
        });
      };

      $scope.editDashboard = (id, item) => {
        $scope.$emit('kibi-dashboard-nav-saving', true);
        const state = {
          appState: {
            viewMode: DashboardViewMode.EDIT
          },
          topNav: {
            currentKey: item.topNavKey
          }
        };
        hashedItemStoreSingleton.setItem('kibi_appstate_param', JSON.stringify(state));
        globalNavState.setOpen(false);
        dashboardGroups.selectDashboard(id);
      };

      $scope.removeDashboardFromGroup = (id) => {
        return new Promise((resolve, reject) => {
          const groups = dashboardGroups.getGroups().filter(group => {
            if (group.virtual) {
              return resolve();
            }
            const idx = _.findIndex(group.dashboards, dashboard => {
              return dashboard.id === id;
            });
            return idx >= 0;
          });
          if (groups.length === 0) {
            return resolve();
          }
          const groupId = groups[0].id;
          return resolve(savedDashboardGroups.get(groupId).then(group => {
            const idx = _.findIndex(group.dashboards, dashboard => {
              return dashboard.id === id;
            });
            group.dashboards.splice(idx, 1);
            return group.save();
          }));
        });
      };

      $scope.deleteDashboard = (id, title) => {
        const confirmMessage = `Are you sure you want to delete '${title}'?`;
        confirmModalPromise(confirmMessage, { confirmButtonText: `Delete dashboard` })
        .then(() => {
          $scope.$emit('kibi-dashboard-nav-saving', true);
          savedDashboards.delete(id)
          .then($scope.removeDashboardFromGroup(id))
          .then(cache.invalidate)
          .then(() => {
            if ($scope.dashboardLoaded === id) {
              $scope.$emit('kibi-dashboard-nav-saving', false);
              notify.info('Dashboard ' + title + ' was successfuly deleted');
              dashboardsNavState.setScrollbarPos(0);
              $scope.$emit('kibi:dashboardgroup:deletedashboard');
            }
          })
          .catch(reason => {
            $scope.$emit('kibi-dashboard-nav-saving', false);
            notify.error(reason);
          });
        });
      };

      $scope.deleteGroup = () => {
        const confirmMessage = `Are you sure you want to delete '${$scope.group.title}'?`;
        confirmModalPromise(confirmMessage, { confirmButtonText: `Delete dashboard group` })
        .then(() => {
          $scope.$emit('kibi-dashboard-nav-saving', true);
          const group = $scope.group;
          savedDashboardGroups.delete(group.id)
          .then(cache.invalidate)
          .then(() => {
            $scope.$emit('kibi-dashboard-nav-saving', false);
            notify.info('Dashboard Group ' + group.title + ' was successfuly deleted');
            $scope.$emit('kibi:dashboardgroup:changed', group.id);
          })
          .catch(reason => {
            $scope.$emit('kibi-dashboard-nav-saving', false);
            notify.error(reason);
          });
        });
      };

      // This will ensure call the notification event one time per digest.
      $scope.notifyReloadCounts = _.once(() => {
        $scope.$emit('kibi:dashboardgroup:reloadcounts');
      });

      $scope.$watch('filter', (value) => {
        if (value && value.length > 0) {
          $scope.group.collapsed = false;
          $scope.notifyReloadCounts();
        }
      });

      $scope.dashboardIsHighlighted = (dashboard) => {
        return dashboard.$$highlight;
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

      const anchor = jQuery($element).find('.dashboards-nav-edit-link-group');

      $scope.showFilterIconMessage = function () {
        $scope.tooltipContent = $scope.tooltipContent + $scope.group.selected.filterIconMessage;
        $scope.refreshTooltipContent();
      };

      $scope.removeFilterIconMessage = function () {
        $scope.setDefaultTooltipContent();
        $scope.refreshTooltipContent();
      };

      $scope.refreshTooltipContent = function () {
        anchor.qtip('option', 'content.text', $scope.tooltipContent);
      };

      // $scope.initQtip = function () {
      //   anchor.qtip({
      //     content: {
      //       title: 'Dashboard',
      //       text: function () {
      //         return $scope.tooltipContent;
      //       }
      //     },
      //     position: {
      //       my: 'left top',
      //       at: 'right center'
      //     },
      //     show: {
      //       event: 'mouseenter',
      //       solo: true
      //     },
      //     hide: {
      //       event: 'mouseleave'
      //     },
      //     style: {
      //       classes: 'qtip-light qtip-rounded qtip-shadow'
      //     }
      //   });
      // };

      $scope.humanNotation = number => {
        if (_.isNumber(number)) {
          return numeral.set(number).format('0.[00]a');
        }
      };

      $scope.setDefaultTooltipContent = function () {
        $scope.tooltipContent = $scope.group.title;
        if ($scope.group.dashboards.length > 1) {
          $scope.tooltipContent += ` (${$scope.group.selected.title})`;
        }
        if ($scope.group.selected && $scope.group.selected.count !== undefined) {
          try {
            $scope.countHumanNotation = numeral.set($scope.group.selected.count).format('0.[00]a');
          } catch (err) {
            // count may not be a number, e.g., it can be Forbidden
            $scope.countHumanNotation = $scope.group.selected.count;
          }
          $scope.tooltipContent += ` (${$scope.group.selected.count})`;
        }
      };

      $scope.$watchGroup([ 'group.selected.title', 'group.selected.count' ], () => {
        delete $scope.countHumanNotation;
        $scope.setDefaultTooltipContent();
        // $scope.refreshTooltipContent();
        // $scope.initQtip();
      });

      // end port

      const groupAnchor = jQuery($element).find('.title');

      $scope.isSidebarOpen = dashboardsNavState.isOpen();
      $scope.$watch(dashboardsNavState.isOpen, isOpen => {
        $scope.isSidebarOpen = isOpen;
      });

      // $scope.initQtip = function () {
      //   groupAnchor.qtip({
      //     content: {
      //       title: 'Group',
      //       text: function () {
      //         return $scope.group.title;
      //       }
      //     },
      //     position: {
      //       my: 'left top',
      //       at: 'right center'
      //     },
      //     show: {
      //       event: 'mouseenter',
      //       solo: true
      //     },
      //     hide: {
      //       event: 'mouseleave'
      //     },
      //     style: {
      //       classes: 'qtip-light qtip-rounded qtip-shadow'
      //     }
      //   });
      // };
      //
      // $scope.$watchGroup([ 'group.title', 'group.dashboards' ], () => {
      //   $scope.initQtip();
      // });
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
