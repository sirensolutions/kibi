define(function (require) {
  return function SavedObjectRequestProvider(Private) {
    let _ = require('lodash');

    let DocRequest = Private(require('ui/courier/fetch/request/doc'));
    let strategy = Private(require('ui/courier/fetch/strategy/savedobject'));

    _.class(SavedObjectRequest).inherits(DocRequest);
    function SavedObjectRequest(source, defer) {
      SavedObjectRequest.Super.call(this, source, defer);

      this.type = 'savedObject';
      this.strategy = strategy;
    }

    return SavedObjectRequest;
  };
});
