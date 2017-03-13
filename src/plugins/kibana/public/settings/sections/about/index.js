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
.controller('settingsAbout', function ($scope, kbnVersion, kibiVersion, kibiKibanaAnnouncement, buildNum, buildSha) {
  $scope.kbnVersion = kbnVersion;
  $scope.buildNum = buildNum;
  $scope.buildSha = buildSha;
  $scope.kibiVersion = kibiVersion; // kibi: added to manage kibi version
  $scope.kibiKibanaAnnouncement = kibiKibanaAnnouncement; // kibi: added by kibi
  $scope.currentYear = new Date().getFullYear(); // kibi: added by kibi
});

registry.register(_.constant({
  order: 1010, // kibi: change to 1010 to make sure it comes after license
  name: 'about',
  display: 'About',
  url: '#/settings/about'
}));
