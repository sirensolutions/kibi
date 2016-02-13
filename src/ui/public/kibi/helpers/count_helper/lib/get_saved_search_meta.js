define(function (require) {
  var _ = require('lodash');

  return function getSavedSearchMeta(savedSearch) {
    var savedSearchMeta;
    /*eslint-disable no-empty */
    try {
      return JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
    } catch (e) {}
    /*eslint-enable no-empty */
    return {};
  };
});
