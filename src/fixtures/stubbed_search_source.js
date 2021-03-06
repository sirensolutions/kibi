import sinon from 'sinon';
import searchResponse from 'fixtures/search_response';
import { stubbedLogstashIndexPatternService } from 'fixtures/stubbed_logstash_index_pattern';

export function StubbedSearchSourceProvider(Private, $q, Promise) {
  let deferedResult = $q.defer();
  const indexPattern = Private(stubbedLogstashIndexPatternService);

  let onResultsCount = 0;
  return {
    sort: sinon.spy(),
    size: sinon.spy(),
    fetch: sinon.spy(),
    destroy: sinon.spy(),
    get: function (param) {
      switch (param) {
        case 'index':
          return indexPattern;
        default:
          throw new Error('Param "' + param + '" is not implemented in the stubbed search source');
      }
    },
    crankResults: function (mySearchResponse) {
      // kibi: added mySearchResponse to be able to test our own results
      if (mySearchResponse) {
        deferedResult.resolve(mySearchResponse);
      } else {
        deferedResult.resolve(searchResponse);
      }
      // kibi: end
      deferedResult = $q.defer();
    },
    onResults: function () {
      onResultsCount++;

      // Up to the test to resolve this manually
      // For example:
      // someHandler.resolve(require('fixtures/search_response'))
      return deferedResult.promise;
    },
    getOnResultsCount: function () {
      return onResultsCount;
    },
    onError: function () { return $q.defer().promise; },
    _flatten: function () {
      return Promise.resolve({ index: indexPattern, body: {} });
    }
  };

}
