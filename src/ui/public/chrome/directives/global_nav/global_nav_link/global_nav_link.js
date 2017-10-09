
import globalNavLinkTemplate from './global_nav_link.html';
import './global_nav_link.less';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('globalNavLink', chrome => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isActive: '=',
      isDisabled: '=',
      tooltipContent: '=',
      onClick: '&',
      url: '=',
      kbnRoute: '=',
      icon: '=',
      label: '=',
      // kibi: adds customization options
      kibiTooltipExtraClasses: '@',
      kibiIndicatorClass: '=',
      kibiIndicatorIcon: '='
      // kibi: end
    },
    template: globalNavLinkTemplate,
    link: scope => {
      scope.getHref = () => {
        if (scope.url) {
          return scope.url;
        }

        if (scope.kbnRoute) {
          return chrome.addBasePath(scope.kbnRoute);
        }
      };
    }
  };
});
