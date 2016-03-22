import _ from 'lodash';
import registry from 'ui/registry/settings_sections';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/settings/sections/about/index.html';

uiRoutes
.when('/settings/about', {
  template: require('plugins/kibana/settings/sections/about/index.html')
});

uiModules.get('apps/settings')
.controller('settingsAbout', function ($scope, kbnVersion, kibiVersion, buildNum, buildSha) {
  $scope.kbnVersion = kbnVersion;
  $scope.kibiVersion = kibiVersion; // kibi: added to manage kibi version
  $scope.buildNum = buildNum;
  $scope.buildSha = buildSha;
});

registry.register(_.constant({
  order: 1001,
  name: 'about',
  display: 'About',
  url: '#/settings/about'
}));
