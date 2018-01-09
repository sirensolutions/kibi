import expect from 'expect.js';
import { SearchHelper } from 'ui/kibi/helpers/search_helper';

describe('Kibi Components', function () {
  describe('SearchHelper', function () {
    describe('optimize', function () {

      it('should return a query against the default index with an empty search body when there are no indices and' +
         ' no index pattern', () => {
        const searchHelper = new SearchHelper('.kibiz');
        const expected = '{"index":[".kibiz"],"ignore_unavailable": true}\n' +
                         '{"query":{"match_none":{}}}\n';

        const actual = searchHelper.optimize([], {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: []
                }
              }
            }
          }
        });
        expect(actual).to.be(expected);
      });

      it('should return a query against the index pattern with an empty search body when there are no indices', () => {
        const searchHelper = new SearchHelper('.kibiz');
        const expected = '{"index":["logstash-*"],"ignore_unavailable": true}\n' +
          '{"query":{"match_none":{}}}\n';

        const actual = searchHelper.optimize([], {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              },
              must_not: [],
              filter: {
                bool: {
                  must: []
                }
              }
            }
          }
        }, "logstash-*");
        expect(actual).to.be(expected);
      });

      it('should not modify a query against one or more indices.', () => {
        const searchHelper = new SearchHelper('.siren');
        const expected = '{"index":["log-2000*","log-2001*"],"ignore_unavailable": true}\n' +
                         '{"size":0,"query":{"bool":{"must":{"match_all":{}}}}}\n';

        const actual = searchHelper.optimize(['log-2000*', 'log-2001*'], {
          size: 0,
          query: {
            bool: {
              must: {
                match_all: {}
              }
            }
          }
        });
        expect(actual).to.be(expected);
      });
    });
  });
});
