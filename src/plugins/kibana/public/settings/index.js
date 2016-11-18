import _ from 'lodash';
import 'plugins/kibana/settings/sections/indices/index';
import 'plugins/kibana/settings/sections/advanced/index';
import 'plugins/kibana/settings/sections/objects/index';
import 'plugins/kibana/settings/sections/status/index';
import 'plugins/kibana/settings/sections/about/index';

import 'plugins/kibana/settings/sections/kibi_relations/index';        // kibi: added by kibi
import 'plugins/kibana/settings/sections/kibi_datasources/index';      // kibi: added by kibi
import 'plugins/kibana/settings/sections/kibi_queries/index';          // kibi: added by kibi
import 'plugins/kibana/settings/sections/kibi_templates/index';        // kibi: added by kibi
import 'plugins/kibana/settings/sections/kibi_dashboard_groups/index'; // kibi: added by kibi
import 'ui/kibi/helpers/kibi_session_helper/services/index';           // kibi: added by kibi


import 'plugins/kibana/settings/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import 'plugins/kibana/settings/sections/indices/_indexed_fields';
import 'plugins/kibana/settings/sections/indices/_scripted_fields';
import registry from 'ui/registry/settings_sections';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import appTemplate from 'plugins/kibana/settings/app.html';


uiRoutes
.when('/settings', {
  redirectTo: '/settings/indices'
});

require('ui/index_patterns/routeSetup/loadDefault')({
  notRequiredRe: /^\/settings\//,
  whenMissingRedirectTo: '/settings/indices'
});

uiModules
.get('apps/settings')
.directive('kbnSettingsApp', function (Private, $route, timefilter) {
  const sections = Private(registry);

  return {
    restrict: 'E',
    template: appTemplate,
    transclude: true,
    scope: {
      sectionName: '@section'
    },
    link: function ($scope, $el) {

      timefilter.enabled = false;
      $scope.sections = sections;
      $scope.sections = sections.inOrder;
      $scope.section = _.find($scope.sections, { name: $scope.sectionName });

      $scope.sections.forEach(function (section) {
        section.class = (section === $scope.section) ? 'active' : void 0;
      });
    }
  };
});
