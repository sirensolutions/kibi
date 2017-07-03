import { cloneDeep } from 'lodash';
export default function CacheHelperFactory($rootScope, Promise) {

  // we will store values in memory
  let cache = {};


  // We wrap cache library in simple helper
  // in case we would like to change the underlying implementation in future (e.g. use localStorage)
  // it will be easy to do it here
  function CacheHelper() {
  }

  CacheHelper.prototype.set = function (key, value) {
    cache[key] = value;
  };

  // We need to clone the item before return the reference
  CacheHelper.prototype.get = function (key) {
    return cache[key] ? cloneDeep(cache[key]) : null;
  };

  CacheHelper.prototype.invalidate = function () {
    cache = {};
  };

  const cacheHelperInstance = new CacheHelper();

  // invalidate the cache on route change
  $rootScope.$on('$routeChangeSuccess', function () {
    cacheHelperInstance.invalidate();
  });

  return cacheHelperInstance;
};
