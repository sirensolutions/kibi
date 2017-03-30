import template from './dashboards_nav_control.html';
import './dashboards_nav_control.less';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardsNavControl', () => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isOpen: '=',
      isActive: '=',
      tooltipContent: '@',
      onClick: '&',
      kbnIcon: '@',
      iconCss: '@',
      title: '@'
    },
    template
  };
});
