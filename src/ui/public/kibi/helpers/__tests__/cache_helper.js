const _ = require('lodash');
const expect = require('expect.js');
const ngMock = require('ngMock');
let $rootScope;
let cacheHelper;

describe('Kibi Components', function () {
  describe('Cache Helper', function () {
    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        cacheHelper = Private(require('ui/kibi/helpers/cache_helper'));
      });
    });

    it('setting a key-value pair is cached', function () {
      expect(cacheHelper.get('aaa')).to.be(null);
      cacheHelper.set('aaa', 'bbb');
      expect(cacheHelper.get('aaa')).to.be('bbb');
    });

    it('clearing the cache', function () {
      cacheHelper.set('aaa', 'bbb');
      expect(cacheHelper.get('aaa')).to.be('bbb');
      cacheHelper.flush();
      expect(cacheHelper.get('aaa')).to.be(null);
    });

    it('clearing the cache on route change', function () {
      cacheHelper.set('aaa', 'bbb');
      expect(cacheHelper.get('aaa')).to.be('bbb');
      $rootScope.$emit('$routeChangeSuccess', null);
      expect(cacheHelper.get('aaa')).to.be(null);
    });
  });
});
