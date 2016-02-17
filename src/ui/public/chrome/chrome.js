require('babel/polyfill');

var _ = require('lodash');
var $ = require('jquery');
var angular = require('angular');

require('ui/timefilter');
require('ui/private');
require('ui/promises');

var metadata = require('ui/metadata');

var chrome = {};
var internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

$('<link>').attr({
  href: require('ui/kibi/images/favicon.ico'), // kibi: replaced kibana favicon
  rel: 'shortcut icon'
}).appendTo('head');

require('./api/apps')(chrome, internals);
require('./api/xsrf')(chrome, internals);
require('./api/nav')(chrome, internals);
require('./api/angular')(chrome, internals);
require('./api/controls')(chrome, internals);
require('./api/tabs')(chrome, internals);
require('./api/template')(chrome, internals);
require('./api/theme')(chrome, internals);

chrome.bootstrap = function () {
  chrome.setupAngular();
  angular.bootstrap(document, ['kibana']);
};

if (chrome.getApp().id === 'kibana') {
  require('ui/kibi/styles/kibi'); // kibi: added to style the logo
  require('ui/kibi/directives/kibi_nav_bar'); // kibi: added so we can inject our own kibi-nav-bar
  require('ui/kibi/directives/kibi_dashboard_search'); // kibi: added so we can inject our own kibi-dashboard-search bar
  require('ui/kibi/directives/kibi_relational_filter_panel'); // kibi: add the dashboards graph panel
}

module.exports = chrome;
