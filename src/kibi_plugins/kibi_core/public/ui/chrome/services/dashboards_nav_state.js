import uiModules from 'ui/modules';
import angular from 'angular';

uiModules
.get('kibana')
.service('dashboardsNavState', (sessionStorage, localStorage, $rootScope) => {
  return {
    isOpen: () => {
      const isOpen = localStorage.get('kibi.isDashboardsNavOpen');
      return isOpen === null ? true : isOpen;
    },

    setOpen: isOpen => {
      localStorage.set('kibi.isDashboardsNavOpen', isOpen);
      $rootScope.$broadcast('dashboardsNavState:change');
      return isOpen;
    },

    isGroupEditorOpen: () => {
      const isGroupEditorOpen = sessionStorage.get('kibi.isDashboardsNavGroupEditorOpen');
      return isGroupEditorOpen === null ? false : isGroupEditorOpen;
    },

    setGroupEditorOpen: isGroupEditorOpen => {
      sessionStorage.set('kibi.isDashboardsNavGroupEditorOpen', isGroupEditorOpen);
      $rootScope.$broadcast('dashboardsNavState:change');
      return isGroupEditorOpen;
    },

    navWidth: () => {
      const navWidth = localStorage.get('kibi.dashboardNavWidth');
      const DEFAULT_DASHBOARD_NAV_WIDTH = 275;
      return navWidth === null ? DEFAULT_DASHBOARD_NAV_WIDTH : navWidth;
    },

    setNavWidth: navWidth => {
      localStorage.set('kibi.dashboardNavWidth', navWidth);
      $rootScope.$broadcast('dashboardsNavState:change');
      return navWidth;
    },

    scrollbarPos: () => {
      const scrollbarPos = sessionStorage.get('kibi.dashboardScrollbarPos');
      const DEFAULT_DASHBOARD_SCROLLBAR_POS = 0;
      return scrollbarPos === null ? DEFAULT_DASHBOARD_SCROLLBAR_POS : scrollbarPos;
    },

    setScrollbarPos: scrollbarPos => {
      sessionStorage.set('kibi.dashboardScrollbarPos', scrollbarPos);
      $rootScope.$broadcast('dashboardsNavState:change');
      return scrollbarPos;
    },

    collapsedGroups: () => {
      const collapsedGroups = sessionStorage.get('kibi.collapsedGroups');
      return collapsedGroups === null ? {} : collapsedGroups;
    },

    setCollapsedGroups: collapsedGroups => {
      sessionStorage.set('kibi.collapsedGroups', collapsedGroups);
      $rootScope.$broadcast('dashboardsNavState:change');
      return collapsedGroups;
    },
  };
});
