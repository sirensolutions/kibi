import StrategyProvider from 'ui/courier/fetch/strategy/savedobject';
import DocRequestProvider from 'ui/courier/fetch/request/doc_admin';
import _ from 'lodash';

export default function SavedObjectRequestProvider(Private) {
  const DocRequest = Private(DocRequestProvider);
  const strategy = Private(StrategyProvider);

  _.class(SavedObjectRequest).inherits(DocRequest);
  function SavedObjectRequest(source, defer) {
    SavedObjectRequest.Super.call(this, source, defer);

    this.type = 'savedObject';
    this.strategy = strategy;
  }

  return SavedObjectRequest;
};
