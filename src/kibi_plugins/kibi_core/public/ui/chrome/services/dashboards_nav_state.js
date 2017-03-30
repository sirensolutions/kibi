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
    }
  };
});
