import _ from 'lodash';

// kibi: require savedobjectsapi
export function IndexPatternsGetIdsProvider(savedObjectsAPI, kbnIndex) {

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  let cachedPromise;

  const getIds = function () {
    if (cachedPromise) {
      // return a clone of the cached response
      return cachedPromise.then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    // kibi: use the savedObjectsAPI
    cachedPromise = savedObjectsAPI.search({
      index: kbnIndex,
      type: 'index-pattern',
      //TODO MERGE 5.5.2 create an issue for this or remove if it isn't necessary anymore
      // KIBI5: @fabiocorneti how to pass this ? storedFields: [],
      // storedFields: [],
      size: 10000
    })
    // kibi: end
    .then(function (resp) {
      return _.pluck(resp.hits.hits, '_id');
    });

    // ensure that the response stays pristine by cloning it here too
    return cachedPromise.then(function (resp) {
      return _.clone(resp);
    });
  };

  getIds.clearCache = function () {
    cachedPromise = null;
  };

  return getIds;
}
