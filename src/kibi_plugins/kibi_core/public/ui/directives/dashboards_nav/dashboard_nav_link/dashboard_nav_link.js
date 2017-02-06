import dashboardNavLinkTemplate from './dashboard_nav_link.html';
import './dashboard_nav_link.less';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardNavLink', chrome => {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      count: '=',
      countSpinner: '=',
      isPruned: '=',
      filterIconMessage: '=',
      classes: '@',
      showIcon: '=',
      isActive: '=',
      tooltipContent: '=',
      onClick: '&',
      iconUrl: '=',
      iconCss: '=',
      title: '='
    },
    template: dashboardNavLinkTemplate
  };
});
