define(function (require) {
  var _ = require('lodash');

  return function getSavedSearchMeta(savedSearch) {
    var savedSearchMeta;
    try {
      return JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
    } catch (e) {
    }
    return {};
  };
});
