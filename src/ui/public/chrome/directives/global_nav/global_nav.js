
import './app_switcher';
import './global_nav_link';

import globalNavTemplate from './global_nav.html';
import './global_nav.less';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('globalNav', (globalNavState, $window) => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      chrome: '=',
      isVisible: '=',
      logoBrand: '=',
      smallLogoBrand: '=',
      appTitle: '=',
    },
    template: globalNavTemplate,
    link: scope => {
      // App switcher functionality.
      function updateGlobalNav() {
        const isOpen = globalNavState.isOpen();
        scope.isGlobalNavOpen = isOpen;
        scope.globalNavToggleButton = {
          classes: isOpen ? 'global-nav-link--close' : undefined,
          title: isOpen ? 'Collapse' : 'Expand',
          tooltipContent: isOpen ? 'Collapse side bar' : 'Expand side bar',
        };

        // Notify visualizations, e.g. the dashboard, that they should re-render.
        scope.$root.$broadcast('globalNav:update');
      }

      updateGlobalNav();

      //TODO: SLS: Put a right click menu to open a new kibi session
      scope.gotoDashboard = () => {
        const dashboardLink = scope.chrome.getNavLinks().filter(link => link.id === 'kibana:dashboard')[0];
        if (dashboardLink.linkToLastSubUrl) {
          $window.location.href = dashboardLink.lastSubUrl;
        } else {
          $window.location.href = dashboardLink.url;
        }
      };

      scope.$root.$on('globalNavState:change', () => {
        updateGlobalNav();
      });

      scope.toggleGlobalNav = (event, force) => {
        // siren: allows user to click on empty areas
        if (event.target === event.currentTarget || force) {
          event.preventDefault();
          globalNavState.setOpen(!globalNavState.isOpen());
        }
      };

    }
  };
});
