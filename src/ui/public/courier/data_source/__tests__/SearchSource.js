import ngMock from 'ngMock';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

import RequestQueueProv from '../../_request_queue';
import SearchSourceProv from '../search_source';

describe('SearchSource', function () {
  require('testUtils/noDigestPromises').activateForSuite();

  let requestQueue;
  let SearchSource;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (timefilter, Private) {
    sinon.stub(timefilter, 'get');
    requestQueue = Private(RequestQueueProv);
    SearchSource = Private(SearchSourceProv);
  }));

  describe('#onResults()', function () {
    it('adds a request to the requestQueue', function () {
      const source = new SearchSource();

      expect(requestQueue).to.have.length(0);
      source.onResults();
      expect(requestQueue).to.have.length(1);
    });

    it('returns a promise that is resolved with the results', function () {
      const source = new SearchSource();
      const fakeResults = {};

      const promise = source.onResults().then((results) => {
        expect(results).to.be(fakeResults);
      });

      requestQueue[0].defer.resolve(fakeResults);
      return promise;
    });
  });

  describe('#destroy()', function () {
    it('aborts all startable requests', function () {
      const source = new SearchSource();
      source.onResults();
      sinon.stub(requestQueue[0], 'canStart').returns(true);
      source.destroy();
      expect(requestQueue).to.have.length(0);
    });

    it('aborts all non-startable requests', function () {
      const source = new SearchSource();
      source.onResults();
      sinon.stub(requestQueue[0], 'canStart').returns(false);
      source.destroy();
      expect(requestQueue).to.have.length(0);
    });
  });

  describe('Kibi', function () {
    it('should put user queries into the query clause of the filtered query', function () {
      const initialState = {
        index: {
          getComputedFields: function () {
            return {};
          }
        },
        query: 'google',
        filter: [
          {
            query: {
              query_string: {
                query: 'torrent'
              }
            }
          },
          {
            meta: {
              disabled: false
            },
            query: {
              match: {
                message: 'toto'
              }
            }
          }
        ]
      };
      const source = new SearchSource(initialState);
      return source._flatten()
      .then(flatState => {
        const query = flatState.body.query;
        expect(query.filtered.query.bool.must).to.have.length(2);
        expect(query.filtered.query.bool.must[0].query_string.query).to.be('google');
        expect(query.filtered.query.bool.must[1].query_string.query).to.be('torrent');
        expect(query.filtered.filter.bool.must).to.have.length(1);
        expect(query.filtered.filter.bool.must[0].query.match.message).not.to.be(undefined);
      });
    });
  });
});
