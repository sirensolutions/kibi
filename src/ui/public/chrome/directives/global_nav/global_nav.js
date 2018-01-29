
import './app_switcher';
import './global_nav_link';

// kibi: imports
import 'ui/kibi/directives/kibi_context_menu';
// kibi: end

import globalNavTemplate from './global_nav.html';
import './global_nav.less';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('globalNav', (globalNavState, $window,
  // kibi: services
  $timeout
  // kibi: end
  ) => {
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

      // kibi: click on the logo to go to the dashboard
      scope.gotoDashboard = () => {
        const dashboardLink = scope.chrome.getNavLinks().filter(link => link.id === 'kibana:dashboard')[0];
        if (dashboardLink.linkToLastSubUrl) {
          $window.location.href = dashboardLink.lastSubUrl;
        } else {
          $window.location.href = dashboardLink.url;
        }
        // kibi: if it is 'status' page, reload the page
        if ($window.document.getElementsByClassName('kibi-es-diagnostics').length > 0) {
          $window.location.reload();
        };
      };

      // kibi: context menu over icon allows to open a clean Kibi session
      scope.kibiContextMenuOptions = [{
        id: 'new-session',
        name: 'Open a new session'
      }];
      scope.kibiNewCleanSession = () => {
        const forcedReload = false;
        const newWindow = $window.open($window.location.origin + $window.location.pathname + '#/?clearSirenSession=true');
        if (newWindow) {
          // NOTE: without this little wait firefox will end up with blank window
          $timeout(() => {
            newWindow.location.reload(forcedReload);
          }, 100);
        }
      };
      // kibi: end

      scope.$root.$on('globalNavState:change', () => {
        updateGlobalNav();
      });

      scope.toggleGlobalNav = (event, force) => {
        // kibi: allows user to click on empty areas
        if (event.target === event.currentTarget || force) {
          event.preventDefault();
          globalNavState.setOpen(!globalNavState.isOpen());
        }
      };

    }
  };
});
