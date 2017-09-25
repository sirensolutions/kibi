import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import '../api';

describe('KibiEmbeddingAPI', function () {

  let $window;
  let $injector;

  const fakeURLBase = 'http://localhost:5606/goto/123';
  const fakeSharingService = {
    generateShortUrl: function () {
      return Promise.resolve(fakeURLBase);
    },
    addParamsToUrl: function (url, shareAsEmbed, displayNavBar) {
      return url;
    }
  };

  beforeEach(function () {
    ngMock.module('kibana');
    ngMock.inject(function (_$window_, _$injector_) {
      $window = _$window_;
      $injector = _$injector_;
    });
  });

  afterEach(function () {
    if ($injector.has && $injector.has.restore) {
      $injector.has.restore();
    }
    if ($injector.get && $injector.get.restore) {
      $injector.get.restore();
    }
  });

  describe('sharingService available', function () {

    it('should generate the url', function (done) {
      sinon.stub($injector, 'has', function () {
        return true;
      });
      sinon.stub($injector, 'get', function (name) {
        if (name === 'sharingService') {
          return fakeSharingService;
        }
        return undefined;
      });

      expect($window.kibi).to.ok();

      $window.kibi.generateShortUrl().then((url) => {
        expect(url).to.equal(fakeURLBase);
        done();
      }).catch(done);
    });

  });

  describe('sharingService NOT available', function () {

    it('should fail with proper error', function (done) {
      sinon.stub($injector, 'has', function (name) {
        return name !== 'sharingService';
      });

      expect($window.kibi).to.ok();

      $window.kibi.generateShortUrl().then((url) => {
        done('Should reject');
      }).catch((err) => {
        expect(err.message).to.equal('SharingService not available');
        done();
      });
    });

  });
});
