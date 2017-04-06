import uiModules from 'ui/modules';
import angular from 'angular';

uiModules
.get('kibana')
.service('dashboardsNavState', (localStorage, $rootScope) => {
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

    isOnEditMode: () => {
      const isOnEditMode = localStorage.get('kibi.isDashboardsNavOnEditMode');
      return isOnEditMode === null ? false : isOnEditMode;
    },

    setEditMode: isOnEditMode => {
      localStorage.set('kibi.isDashboardsNavOnEditMode', isOnEditMode);
      $rootScope.$broadcast('dashboardsNavState:change');
      return isOnEditMode;
    },

    isGroupEditorOpen: () => {
      const isGroupEditorOpen = localStorage.get('kibi.isDashboardsNavGroupEditorOpen');
      return isGroupEditorOpen === null ? false : isGroupEditorOpen;
    },

    setGroupEditorOpen: isGroupEditorOpen => {
      localStorage.set('kibi.isDashboardsNavGroupEditorOpen', isGroupEditorOpen);
      $rootScope.$broadcast('dashboardsNavState:change');
      return isGroupEditorOpen;
    }
  };
});
