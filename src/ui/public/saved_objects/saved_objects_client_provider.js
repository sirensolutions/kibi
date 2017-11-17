import chrome from 'ui/chrome';

import { SavedObjectsClient } from './saved_objects_client';

export function SavedObjectsClientProvider($http, $q, savedObjectsAPI, kbnIndex) {
  return new SavedObjectsClient($http, chrome.getBasePath(), $q, savedObjectsAPI, kbnIndex);
}
