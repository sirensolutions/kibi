import { CacheProvider } from 'ui/kibi/helpers/cache_helper';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';

let $rootScope;
let cacheHelper;

describe('Kibi Components', function () {
  describe('Cache Helper', function () {
    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        cacheHelper = Private(CacheProvider);
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
      cacheHelper.invalidate();
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
