import _ from 'lodash';
import angular from 'angular';

import metadata from 'ui/metadata';
import 'babel/polyfill';
import 'ui/timefilter';
import 'ui/notify';
import 'ui/private';
import 'ui/promises';
import 'ui/storage';
import 'ui/directives/kbn_src';
import 'ui/watch_multi';
import './services';

const chrome = {};
const internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    devMode: true,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

// KIBI5: where is the icon set now ?
//$('<link>').attr({
  //href: require('ui/kibi/images/favicon.ico'), // kibi: replaced kibana favicon
  //rel: 'shortcut icon'
//}).appendTo('head');

require('./api/apps')(chrome, internals);
require('./api/xsrf')(chrome, internals);
require('./api/nav')(chrome, internals);
require('./api/angular')(chrome, internals);
require('./api/controls')(chrome, internals);
require('./api/template')(chrome, internals);
require('./api/theme')(chrome, internals);

chrome.bootstrap = function () {
  chrome.setupAngular();
  angular.bootstrap(document, ['kibana']);
};

// KIBI5: keep this ?
//if (chrome.getApp && chrome.getApp() && chrome.getApp().id === 'kibana') {
  //require('ui/kibi/styles/kibi'); // kibi: added to style the logo
  //require('ui/kibi/directives/kibi_nav_bar'); // kibi: added so we can inject our own kibi-nav-bar
  //require('ui/kibi/directives/kibi_dashboard_search'); // kibi: added so we can inject our own kibi-dashboard-search bar
  //require('ui/kibi/directives/kibi_relational_filter_panel'); // kibi: add the dashboards graph panel
//}

module.exports = chrome;
