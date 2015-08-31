module.exports = function (grunt) {
  return {
    options: {
      licenses: [
        'MIT',
        'MIT*',
        'MIT/X11',
        'new BSD, and MIT',
        'BSD',
        'BSD*',
        'BSD New',
        'BSD-like',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'Apache',
        'Apache*',
        'Apache v2',
        'Apache 2.0',
        'Apache2',
        'Apache-2.0',
        'Apache, Version 2.0',
        'ISC',
        'WTFPL',
        'Public-Domain'
      ],
      overrides: {
        'FileSaver@undefined': ['MIT'],
        'amdefine@0.1.1': ['MIT'],
        'amdefine@1.0.0': ['MIT'],
        'angular-bootstrap@0.10.0': ['MIT'],
        'angular-ui-ace@0.2.3': ['MIT'],
        'assert-plus@0.1.5': ['MIT'],
        'commander@2.2.0': ['MIT'],
        'cycle@1.0.3': ['Public-Domain'],
        'debug@0.7.4': ['MIT'],
        'leaflet@0.7.2': ['BSD-2-Clause'],
        'moment-timezone@0.0.6': ['MIT'],
        'ng-tags-input@2.3.0': ['MIT'],
        'pkginfo@0.2.3': ['MIT'],
        'rc@1.0.3': ['MIT'],
        'uglify-js@2.2.5': ['BSD'],
        'zeroclipboard@2.2.0': ['MIT']
      }
    }
  };
};
