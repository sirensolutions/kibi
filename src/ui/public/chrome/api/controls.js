import _ from 'lodash';

module.exports = function (chrome, internals) {
  /**
   * ui/chrome Controls API
   *
   *   Exposes controls for the Kibana chrome
   *
   *   Visible
   *     determines if the Kibana chrome should be displayed
   */

  let def = true;
  internals.setVisibleDefault = (_def) => def = Boolean(_def);

  /**
   * @param {boolean} display - should the chrome be displayed
   * @return {chrome}
   */
  chrome.setVisible = function (display) {
    internals.visible = Boolean(display);
    return chrome;
  };

  /**
   * @return {boolean} - display state of the chrome
   */
  chrome.getVisible = function () {
    if (_.isUndefined(internals.visible)) return def;
    return internals.visible;
  };

  // kibi: added to be able to share dashboards with visible kibi-nav-bar
  let kibiNavbarVisibleDefault = true;
  internals.setKibiNavbarVisibleDefault = (_def1) => kibiNavbarVisibleDefault = Boolean(_def1);

  chrome.isKibiNavbarVisible = () => {
    return kibiNavbarVisibleDefault;
  };
  // kibi: added

};
