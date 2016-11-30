define(function (require) {
  let _ = require('lodash');

  return function SavedObjectSourceFactory(Private) {
    let DocSource = Private(require('ui/courier/data_source/doc_source'));
    let SavedObjectRequest = Private(require('ui/courier/fetch/request/savedobject'));
    let SavedObjectStrategy = Private(require('ui/courier/fetch/strategy/savedobject'));

    _.class(SavedObjectSource).inherits(DocSource);
    function SavedObjectSource(initialState) {
      SavedObjectSource.Super.call(this, initialState, SavedObjectStrategy);
    }

    /*****
     * PUBLIC API
     *****/

    SavedObjectSource.prototype._createRequest = function (defer) {
      return new SavedObjectRequest(this, defer);
    };

    /*****
     * PRIVATE API
     *****/

    /**
     * Get the type of this SourceAbstract
     * @return {string} - 'savedObject'
     */
    SavedObjectSource.prototype._getType = function () {
      return 'savedObject';
    };

    return SavedObjectSource;
  };
});
