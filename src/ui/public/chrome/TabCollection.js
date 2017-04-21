let _ = require('lodash');
var { startsWith, get, set, omit, wrap, pick } = require('lodash');
let Tab = require('ui/chrome/Tab');
var { parse } = require('url');

function TabCollection(opts = {}) {
  let tabs = [];
  let specs = null;
  let defaults = opts.defaults || {};
  let activeTab = null;

  this.set = function (_specs) {
    specs = _.cloneDeep([].concat(_specs || []));
    this._rebuildTabs();
  };

  this.setDefaults = function () {
    defaults = _.defaults({}, arguments[0], defaults);
    this._rebuildTabs();
  };

  this.get = function () {
    return [].concat(tabs || []);
  };

  this._rebuildTabs = function () {
    _.invoke(this.get(), 'destroy');
    tabs = _.map(specs, function (spec) {
      return new Tab(_.defaults({}, spec, defaults));
    });
  };

  this.getActive = function () {
    return activeTab;
  };

  this.consumeRouteUpdate = function (href, persist) {
    tabs.forEach(function (tab) {
      tab.active = tab.rootRegExp.test(href);
      if (tab.active) {
        activeTab = tab;
        activeTab.setLastUrl(href);
      }
    });

    if (!persist || !activeTab) return;

    let globalState = get(parse(activeTab.getLastPath(), true), 'query._g');
    let kibiState = get(parse(activeTab.getLastPath(), true), 'query._k');

    // siren: adds the appState to the url that allows copy the session to another tab
    let appState = get(parse(activeTab.getLastPath(), true), 'query._a');

    tabs.forEach(tab => tab.updateLastUrlGlobalState(globalState, kibiState, appState));
  };
}

module.exports = TabCollection;
