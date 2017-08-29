import savedObjectStrategyProvider from 'ui/courier/fetch/strategy/savedobject';
import { DocSourceProvider } from 'ui/courier/data_source/doc_source';
import savedObjectRequestProvider from 'ui/courier/fetch/request/savedobject';
import _ from 'lodash';

export default function SavedObjectSourceFactory(Private) {
  const DocSource = Private(DocSourceProvider);
  const SavedObjectRequest = Private(savedObjectRequestProvider);
  const SavedObjectStrategy = Private(savedObjectStrategyProvider);

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
