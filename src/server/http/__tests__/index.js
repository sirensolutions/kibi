import expect from 'expect.js';
import * as kbnTestServer from '../../../test_utils/kbn_server';
import { createEsTestCluster } from '../../../test_utils/es';

describe('routes', () => {
  let kbnServer;
  const es = createEsTestCluster({
    name: 'server/http',
  });

  before(async function () {
    this.timeout(es.getStartTimeout());
    await es.start();
    kbnServer = kbnTestServer.createServerWithCorePlugins();
    await kbnServer.ready();
    await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  });

  after(async () => {
    await kbnServer.close();
    await es.stop();
  });

  describe('cookie validation', function () {
    it('allows non-strict cookies', function (done) {
      const options = {
        method: 'GET',
        url: '/',
        headers: {
          cookie: 'test:80=value;test_80=value'
        }
      };
      kbnTestServer.makeRequest(kbnServer, options, (res) => {
        expect(res.payload).not.to.contain('Invalid cookie header');
        done();
      });
    });

    it('returns an error if the cookie can\'t be parsed', function (done) {
      const options = {
        method: 'GET',
        url: '/',
        headers: {
          cookie: 'a'
        }
      };
      kbnTestServer.makeRequest(kbnServer, options, (res) =>  {
        expect(res.payload).to.contain('Invalid cookie header');
        done();
      });
    });
  });

  describe('url shortener', () => {
    // kibi: renamed to optionsDiscover
    const optionsDiscover = {
      method: 'POST',
      url: '/shorten',
      payload: {
        url: '/app/kibana#/discover'
      }
    };

    it('generates shortened urls', (done) => {
      // kibi: use optionsDiscover instead of shortenOptions
      kbnTestServer.makeRequest(kbnServer, optionsDiscover, (res) => {
        expect(typeof res.payload).to.be('string');
        expect(res.payload.length > 0).to.be(true);
        done();
      });
    });

    it('redirects shortened urls', (done) => {
      // kibi: use optionsDiscover instead of shortenOptions
      kbnTestServer.makeRequest(kbnServer, optionsDiscover, (res) => {
        const payload = res.payload; // kibi: store payload
        const gotoOptions = {
          method: 'GET',
          url: '/goto/' + res.payload
        };
        kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
          expect(res.statusCode).to.be(302);
          // kibi: verify the redirect according to our implementation
          const actual = res.headers.location;
          try {
            expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?`);
          } catch (error) {
            return done(error);
          }
          // kibi: end
          done();
        });
      });
    });

    // kibi: embedding parameters tests
    describe('kibi tests for passing the embedded parameters on', () => {

      describe('discover page', () => {

        it('includes embed parameter in redirect from shortened url', (done) => {
          kbnTestServer.makeRequest(kbnServer, optionsDiscover, (res) => {
            const payload = res.payload;
            const gotoOptions = {
              method: 'GET',
              url: '/goto/' + res.payload + '?embed=true'
            };
            kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
              const actual = res.headers.location;
              try {
                expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?embed=true&`);
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });

        it('includes kibiNavbarVisible parameters in redirect from shortened url', (done) => {
          kbnTestServer.makeRequest(kbnServer, optionsDiscover, (res) => {
            const payload = res.payload;
            const gotoOptions = {
              method: 'GET',
              url: '/goto/' + res.payload + '?embed=true&kibiNavbarVisible=true'
            };
            kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
              const actual = res.headers.location;
              try {
                expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?embed=true&kibiNavbarVisible=true&`);
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });
      });

      describe('dashboard page', () => {

        const optionsDashboard = {
          method: 'POST',
          url: '/shorten',
          payload: {
            url: '/app/kibana#/dashboard/dashA'
          }
        };

        it('includes embed parameter in redirect from shortened url', (done) => {
          kbnTestServer.makeRequest(kbnServer, optionsDashboard, (res) => {
            const payload = res.payload;
            const gotoOptions = {
              method: 'GET',
              url: '/goto/' + res.payload + '?embed=true'
            };
            kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
              const actual = res.headers.location;
              try {
                expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?embed=true&`);
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });

        it('includes kibiNavbarVisible parameters in redirect from shortened url', (done) => {
          kbnTestServer.makeRequest(kbnServer, optionsDashboard, (res) => {
            const payload = res.payload;
            const gotoOptions = {
              method: 'GET',
              url: '/goto/' + res.payload + '?embed=true&kibiNavbarVisible=true'
            };
            kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
              const actual = res.headers.location;
              try {
                expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?embed=true&kibiNavbarVisible=true&`);
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });

      });

      describe('visualize page', () => {

        const optionsVisualize = {
          method: 'POST',
          url: '/shorten',
          payload: {
            url: '/app/kibana#/visualize/visA'
          }
        };

        it('includes embed parameter in redirect from shortened url', (done) => {
          kbnTestServer.makeRequest(kbnServer, optionsVisualize, (res) => {
            const payload = res.payload;
            const gotoOptions = {
              method: 'GET',
              url: '/goto/' + res.payload + '?embed=true'
            };
            kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
              const actual = res.headers.location;
              try {
                expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?embed=true&`);
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });

        it('includes kibiNavbarVisible parameters in redirect from shortened url', (done) => {
          kbnTestServer.makeRequest(kbnServer, optionsVisualize, (res) => {
            const payload = res.payload;
            const gotoOptions = {
              method: 'GET',
              url: '/goto/' + res.payload + '?embed=true&kibiNavbarVisible=true'
            };
            kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
              const actual = res.headers.location;
              try {
                expect(actual).to.be(`/app/kibana#/kibi/restore/${payload}?embed=true&kibiNavbarVisible=true&`);
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });

      });

    });

    // kibi: end
  });
});
