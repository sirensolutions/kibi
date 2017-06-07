import expect from 'expect.js';
import mapUri from '../map_uri';
import { get, defaults } from 'lodash';

describe('plugins/elasticsearch', function () {
  describe('lib/map_uri', function () {

    // kibi: mock the server
    const serverWithSirenPlugin = {
      config() {
        return {
          get(key) {
            if (key === 'elasticsearch.plugins') {
              return [ 'siren-vanguard' ];
            }
          }
        };
      }
    };
    const serverWithoutSirenPlugin = {
      config() {
        return {
          get(key) {
            if (key === 'elasticsearch.plugins') {
              return [];
            }
          }
        };
      }
    };

    let request;

    function stubCluster(settings) {
      settings = defaults(settings || {}, {
        url: 'http://localhost:9200',
        requestHeadersWhitelist: ['authorization'],
        customHeaders: {}
      });

      return {
        getUrl: () => settings.url,
        getCustomHeaders: () => settings.customHeaders,
        getRequestHeadersWhitelist: () => settings.requestHeadersWhitelist
      };
    }

    beforeEach(function () {
      request = {
        path: '/elasticsearch/some/path',
        headers: {
          cookie: 'some_cookie_string',
          'accept-encoding': 'gzip, deflate',
          origin: 'https://localhost:5601',
          'content-type': 'application/json',
          'x-my-custom-header': '42',
          accept: 'application/json, text/plain, */*',
          authorization: '2343d322eda344390fdw42'
        }
      };
    });

    describe('Kibi', function () {
      describe('siren join', function () {
        it('should add siren to the search action', function () {
          const func = mapUri(stubCluster(), '/elasticsearch', serverWithSirenPlugin, true);

          request.path = '/elasticsearch/_search';
          func(request, (err, upstreamUri, upstreamHeaders) => {
            expect(err).to.be(null);
            expect(upstreamUri.endsWith('/siren/_search')).to.be(true);
          });
        });

        it('should add siren to the search action', function () {
          const func = mapUri(stubCluster(), '/elasticsearch', serverWithSirenPlugin, true);

          request.path = '/elasticsearch/_msearch';
          func(request, (err, upstreamUri, upstreamHeaders) => {
            expect(err).to.be(null);
            expect(upstreamUri.endsWith('/siren/_msearch')).to.be(true);
          });
        });

        it('should not add siren to the action 1', function () {
          const func = mapUri(stubCluster(), '/elasticsearch', serverWithSirenPlugin, false);

          request.path = '/elasticsearch/_search';
          func(request, (err, upstreamUri, upstreamHeaders) => {
            expect(err).to.be(null);
            expect(upstreamUri).to.not.contain('siren');
          });
        });

        it('should not add siren to the action 2', function () {
          const func = mapUri(stubCluster(), '/elasticsearch', serverWithoutSirenPlugin, true);

          request.path = '/elasticsearch/_search';
          func(request, (err, upstreamUri, upstreamHeaders) => {
            expect(err).to.be(null);
            expect(upstreamUri).to.not.contain('siren');
          });
        });
      });

      describe('debug tags', function () {
        it('getCountsOnButton', function () {
          const func = mapUri(stubCluster(), '/elasticsearch', serverWithoutSirenPlugin, false);

          request.path = '/elasticsearch/_search';
          request.query = {
            getCountsOnButton: '',
            size: 100
          };
          func(request, (err, upstreamUri, upstreamHeaders) => {
            expect(err).to.be(null);
            expect(upstreamUri.endsWith('/_search?size=100')).to.be(true);
          });
        });

        it('getCountsOnTabs', function () {
          const func = mapUri(stubCluster(), '/elasticsearch', serverWithoutSirenPlugin, false);

          request.path = '/elasticsearch/_search';
          request.query = {
            getCountsOnTabs: '',
            size: 100
          };
          func(request, (err, upstreamUri, upstreamHeaders) => {
            expect(err).to.be(null);
            expect(upstreamUri.endsWith('/_search?size=100')).to.be(true);
          });
        });
      });
    });

    it('sends custom headers if set', function () {
      const settings = {
        customHeaders: { foo: 'bar' }
      };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('foo', 'bar');
      });
    });

    it('sends configured custom headers even if the same named header exists in request', function () {
      const settings = {
        requestHeadersWhitelist: ['x-my-custom-header'],
        customHeaders: { 'x-my-custom-header': 'asconfigured' }
      };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('x-my-custom-header', 'asconfigured');
      });
    });

    it('only proxies the whitelisted request headers', function () {
      const settings = {
        requestHeadersWhitelist: ['x-my-custom-HEADER', 'Authorization'],
      };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('authorization');
        expect(upstreamHeaders).to.have.property('x-my-custom-header');
        expect(Object.keys(upstreamHeaders).length).to.be(2);
      });
    });

    it('proxies no headers if whitelist is set to []', function () {
      const settings = {
        requestHeadersWhitelist: [],
      };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(Object.keys(upstreamHeaders).length).to.be(0);
      });
    });

    it('proxies no headers if whitelist is set to no value', function () {
      const settings = {
        // joi converts `elasticsearch.requestHeadersWhitelist: null` into
        // an array with a null inside because of the `array().single()` rule.
        requestHeadersWhitelist: [ null ],
      };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(Object.keys(upstreamHeaders).length).to.be(0);
      });
    });

    it('strips the /elasticsearch prefix from the path', () => {
      request.path = '/elasticsearch/es/path';

      mapUri(stubCluster(), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('http://localhost:9200/es/path');
      });
    });

    it('extends the es.url path', function () {
      request.path = '/elasticsearch/index/type';
      const settings = { url: 'https://localhost:9200/base-path' };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('https://localhost:9200/base-path/index/type');
      });
    });

    it('extends the es.url query string', function () {
      request.path = '/elasticsearch/*';
      request.query = { foo: 'bar' };
      const settings = { url: 'https://localhost:9200/?base=query' };

      mapUri(stubCluster(settings), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('https://localhost:9200/*?foo=bar&base=query');
      });
    });

    it('filters the _ querystring param', function () {
      request.path = '/elasticsearch/*';
      request.query = { _: Date.now() };

      mapUri(stubCluster(), '/elasticsearch', serverWithoutSirenPlugin)(request, function (err, upstreamUri) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('http://localhost:9200/*');
      });
    });

  });
});
