import angular from 'angular';
import rison from 'rison-node';

import {
  createStateHash,
  HashedItemStoreSingleton,
  isStateHash,
} from 'ui/state_management/state_storage';

/**
 * Hashes state parameters in the given @url.
 *
 * @param {String} url - A URL.
 * @return {String} - The hashed URL.
 */
export function hashUrl(url) {
  let hashed = null;
  let querystring = '';
  const matches = url.match(/(.+#.+?)\?(.*)/);
  hashed = matches[1];
  if (matches) {
    let error = null;

    matches[2].split('&')
    .every(parameter => {
      let targetParameter = parameter;
      if (querystring === '') {
        querystring += '?';
      } else {
        querystring += '&';
      }
      const matches = parameter.match(/_([gak]+)=(.+)/);
      if (matches) {
        const stateParameter = matches[1];
        const stateValue = matches[2];
        if (stateValue && !isStateHash(stateValue)) {
          try {
            const json = angular.toJson(rison.decode(decodeURIComponent(stateValue)));
            const hash = createStateHash(json, hash => {
              return HashedItemStoreSingleton.getItem(hash);
            });
            const isItemSet = HashedItemStoreSingleton.setItem(hash, json);

            if (!isItemSet) {
              error = new Error('Unable to store the state from of the shared URL in the session storage,' +
                ' please try opening the shared link in a new browser tab or window.');
              hashed = null;
              return false;
            }
            targetParameter = `_${stateParameter}=${hash}`;
          } catch (err) {
            error = new Error('Unable to parse the state from the shared URL.');
            hashed = null;
            return false;
          }
        }
      }
      querystring += targetParameter;
      return true;
    });

    if (error) {
      throw error;
    }
  }
  return `${hashed}${querystring}`;
}
