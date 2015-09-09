define(function (require) {
  var _ = require('lodash');

  var $rootScope;
  var cacheHelper;

  describe('Kibi Components', function () {
    describe('Cache Helper', function () {
      beforeEach( function () {
        module('kibana');

        inject(function ($injector, Private, _$rootScope_) {
          $rootScope = _$rootScope_;
          cacheHelper = Private(require('components/sindicetech/cache_helper/cache_helper'));
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
});
