import { SavedObjectStrategyProvider } from 'ui/courier/fetch/strategy/savedobject';
import { AdminDocRequestProvider } from 'ui/courier/fetch/request/doc_admin';
import _ from 'lodash';

export function SavedObjectRequestProvider(Private) {
  const DocRequest = Private(AdminDocRequestProvider);
  const strategy = Private(SavedObjectStrategyProvider);

  _.class(SavedObjectRequest).inherits(DocRequest);
  function SavedObjectRequest(source, defer) {
    SavedObjectRequest.Super.call(this, source, defer);

    this.type = 'savedObject';
    this.strategy = strategy;
  }

  return SavedObjectRequest;
};
