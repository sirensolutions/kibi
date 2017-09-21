import 'plugins/kibana/management/sections';
import 'plugins/kibana/management/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import appTemplate from 'plugins/kibana/management/app.html';
import landingTemplate from 'plugins/kibana/management/landing.html';
import { management } from 'ui/management';
import 'ui/kbn_top_nav';

// kibi: imports
import _ from 'lodash';
import moment from 'moment-timezone';
import loadDefault from 'ui/index_patterns/route_setup/load_default';
// kibi: end

uiRoutes
.when('/management', {
  template: landingTemplate
});

uiRoutes
.when('/management/:section', {
  redirectTo: '/management'
});

// kibi: 'whenMissingRedirectTo' is changed
loadDefault({
  whenMissingRedirectTo: '/management/siren/index'
});

uiModules
.get('apps/management')
.directive('kbnManagementApp', function (Private, $location, timefilter,
  buildNum, buildSha, buildTimestamp, kibiVersion, kibiKibanaAnnouncement, $injector, config, Promise) {
  return {
    restrict: 'E',
    template: appTemplate,
    transclude: true,
    scope: {
      sectionName: '@section',
      omitPages: '@omitBreadcrumbPages'
    },

    link: function ($scope) {
      timefilter.enabled = false;
      $scope.sections = management.items.inOrder;
      $scope.section = management.getSection($scope.sectionName) || management;

      if ($scope.section) {
        $scope.section.items.forEach(item => {
          item.active = `#${$location.path()}`.indexOf(item.url) > -1;
        });
      }

      // kibi: about section improved
      management.getSection('kibana').info = {
        kibiVersion: kibiVersion,
        kibiKibanaAnnouncement: kibiKibanaAnnouncement,
        buildTimestamp: buildTimestamp,
        build: buildNum,
        sha: buildSha,
        currentYear: new Date().getFullYear()
      };

      function verifyLicense() {
        if (!$injector.has('kibiLicenseService')) {
          return Promise.resolve();
        }
        const kibiLicenseService = $injector.get('kibiLicenseService');
        return kibiLicenseService.verifyLicense();
      }

      verifyLicense().then(license => {
        if (license && license.installed) {
          moment.tz.setDefault(config.get('dateFormat:tz'));
          const dateFormat = config.get('dateFormat');
          _.assign(management.getSection('kibana').info, {
            license: 'Installed (' + moment(license.content['valid-date'], 'YYYY/MM/DD').format(dateFormat) + ')',
            licenseDescription: license.content.description,
            licenseGraphBrowserEnabled: license.content['graph-browser'],
            licenseIsValid: license.isValid,
            licenseIsMissing: false,
            licenseMaxNodes: license.content['max-nodes'],
            licenseMaxUsers: license.content['max-users']
          });
        } else {
          _.assign(management.getSection('kibana').info, {
            license: 'Not Installed',
            licenseDescription: null,
            licenseGraphBrowserEnabled: false,
            licenseIsValid: false,
            licenseIsMissing: true,
            licenseMaxNodes: null,
            licenseMaxUsers: null
          });
        }
      });
      // kibi: end
    }
  };
});

uiModules
.get('apps/management')
.directive('kbnManagementLanding', function (kbnVersion) {
  return {
    restrict: 'E',
    link: function ($scope) {
      $scope.sections = management.items.inOrder;
      $scope.kbnVersion = kbnVersion;
    }
  };
});
