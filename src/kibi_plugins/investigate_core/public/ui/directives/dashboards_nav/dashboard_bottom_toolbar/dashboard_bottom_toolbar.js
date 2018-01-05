import template from './dashboard_bottom_toolbar.html';
import './dashboard_bottom_toolbar.less';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardBottomToolbar', () => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isOpen: '=',
      tooltipContent: '@',
      onClick: '&',
      kbnIcon: '@',
      iconCss: '@',
      title: '@',
      dashboardFilter: '='
    },
    template
  };
});
