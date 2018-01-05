import template from './dashboard_top_toolbar.html';
import './dashboard_top_toolbar.less';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('dashboardTopToolbar', () => {
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
      onNewGroupClick: '&',
      isGroupEditorOpen: '=',
      isDashboardsNavOpen: '=',
      onClearFilter: '&',
      createDashboard: '&'
    },
    template
  };
});
