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
import chrome from 'ui/chrome';
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
  whenMissingRedirectTo: '/management/siren/entities'
});

uiModules
.get('apps/management')
.directive('kbnManagementApp', function (Private, $location, timefilter,
  buildNum, buildSha, buildTimestamp, kibiVersion, kibiKibanaAnnouncement,
  $injector, config, Promise, elasticsearchPlugins, elasticsearchVersion) {
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

      // kibi: Gets the vanguard version from the elasticsearchPlugins list
      // for display on the management landing page
      const getVanguardVersion = function (plugins) {
        if (plugins) {
          return plugins.filter(plugin => plugin.component === 'siren-vanguard')
                        .map(plugin => plugin.version)
                        .pop();
        }
      };

      const plugins = elasticsearchPlugins.get({ version: true });
      const vanguardVersion = getVanguardVersion(plugins);

      // kibi: grab configured index
      const kibiIndex = chrome.getInjected('kbnIndex');

      // kibi: about section improved
      management.getSection('kibana').info = {
        kibiVersion: kibiVersion,
        kibiKibanaAnnouncement: kibiKibanaAnnouncement,
        buildTimestamp: buildTimestamp,
        vanguardVersion: vanguardVersion,
        kibiIndex: kibiIndex,
        esVersion: elasticsearchVersion.get(),
        build: buildNum,
        sha: buildSha,
        currentYear: new Date().getFullYear()
      };

      function verifyLicense() {
        if (!$injector.has('sirenLicenseService')) {
          return Promise.resolve();
        }
        const sirenLicenseService = $injector.get('sirenLicenseService');
        return sirenLicenseService.verifyLicense();
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
// kibi: removed kbnVersion as we are not displaying it on the top of management section
.directive('kbnManagementLanding', function () {
  return {
    restrict: 'E',
    link: function ($scope) {
      $scope.sections = management.items.inOrder;
    }
  };
});
