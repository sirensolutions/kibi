import 'plugins/kibana/management/sections';
import 'plugins/kibana/management/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import 'plugins/kibana/management/sections/indices/_indexed_fields';
import 'plugins/kibana/management/sections/indices/_scripted_fields';
import 'plugins/kibana/management/sections/indices/source_filters/source_filters';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import appTemplate from 'plugins/kibana/management/app.html';
import landingTemplate from 'plugins/kibana/management/landing.html';
import management from 'ui/management';
import 'ui/kbn_top_nav';

// kibi: imports
import _ from 'lodash';
import moment from 'moment';
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

require('ui/index_patterns/route_setup/load_default')({
  whenMissingRedirectTo: '/management/siren/index'
});

uiModules
.get('apps/management')
.directive('kbnManagementApp', function (Private, $location, timefilter,
  buildNum, buildSha, buildTimestamp, kibiVersion, kibiKibanaAnnouncement, elasticsearchPlugins, $http, Promise) {
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
        const plugins = elasticsearchPlugins.get();

        if (plugins.indexOf('siren-vanguard') === -1) {
          return Promise.resolve();
        }
        return $http.get(chrome.getBasePath() + '/elasticsearch/_siren/license')
        .then((resp) => {
          let license;
          if (resp.data && resp.data.license) {
            license = resp.data.license;
          }
          return license;
        });
      }

      verifyLicense().then(license => {
        if (license && license.content) {
          const isEmpty = Object.keys(license.content).length === 0;
          let licenseType = '';
          if (!isEmpty) {
            const expiryMoment = moment(license.content['valid-date'], 'YYYY/MM/DD');
            const issueMoment = moment(license.content['issue-date'], 'YYYY/MM/DD');
            licenseType = expiryMoment.diff(issueMoment, 'days') <= 31 ? 'Trial' : 'Full';
          }

          _.assign(management.getSection('kibana').info, {
            licenseType: license.isValid ? licenseType : license.content,
            licenseIsValid: license.isValid
          });
          if (!isEmpty) {
            _.assign(management.getSection('kibana').info, {
              licenseExpiration: license.content['valid-date'],
              elasticNodes: license.content['max-nodes']
            });
          }
        } else {
          _.assign(management.getSection('kibana').info, {
            licenseType: 'None',
            licenseIsValid: false,
            licenseIsMissing: true,
            elasticNodes: 1
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
