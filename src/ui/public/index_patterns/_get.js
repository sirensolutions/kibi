import _ from 'lodash';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function IndexPatternsGetProvider(Private, savedObjectsAPI, kbnIndex) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  let cachedIdPromise;

  const get = function (field) {
    if (field === 'id' && cachedIdPromise) {
      // return a clone of the cached response
      return cachedIdPromise.then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    // kibi: use the savedObjectsAPI
    const promise = savedObjectsAPI.search({
      index: kbnIndex,
      type: 'index-pattern',
      size: 10000
    })
    // kibi: end
    .then(function (resp) {
      return _.pluck(resp.hits.hits, '_id');
    });

    if (field === 'id') {
      cachedIdPromise = promise;
    }

    // ensure that the response stays pristine by cloning it here too
    return promise.then(function (resp) {
      return _.clone(resp);
    });
  };

  return (field) => {
    const getter = get.bind(get, field);
    if (field === 'id') {
      getter.clearCache = function () {
        cachedIdPromise = null;
      };
    }
    return getter;
  };
}
