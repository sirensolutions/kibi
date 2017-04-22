import UrlShortenerProvider from './lib/url_shortener';
import uiModules from 'ui/modules';
import { unhashUrl, getUnhashableStatesProvider } from 'ui/state_management/state_hashing';

uiModules
.get('kibana')
.service('sharingService', function (Private, $location, config) {

  const urlShortener = Private(UrlShortenerProvider);
  const getUnhashableStates = Private(getUnhashableStatesProvider);

  /**
   * Provides methods to share the current state.
   * NOTE:
   * This service has to be here so that it exposes urlShortener.
   *
   * Used in kibi-enterprise/kibi-plugins/enterprise_components/public/api.js
   *
   */
  class SharingService {

    /**
     * Returns the unhashed sharing URL for the current state.
     *
     * @returns {String} - The unhashed sharing URL.
     */
    getSharedUrl() {
      const urlWithHashes = $location.absUrl();
      let url = urlWithHashes;
      if (config.get('state:storeInSessionStorage')) {
        url = unhashUrl(urlWithHashes, getUnhashableStates());
      }
      return url;
    }

    /**
     * Generates a short URL for the current state.
     *
     * @returns {Promise} - Resolved with the short URL.
     */
    async generateShortUrl() {
      return urlShortener.shortenUrl(this.getSharedUrl());
    }

    /**
     * Adds parameters to the URL
     *
     * @param {String} url - URL to modify
     * @param {Boolean} shareAsEmbed - Set to true to enable embedding in the URL.
     * @param {Boolean} displayNavBar - Set to true to display the Kibi navigation bar when embedding is enabled in the URL.
     */
    addParamsToUrl(url, shareAsEmbed, displayNavBar) {
      if (shareAsEmbed) {
        if (displayNavBar) {
          url += '?embed=true&kibiNavbarVisible=true';
        } else {
          url += '?embed=true';
        }
      }
      return url;
    }

  }

  return new SharingService();
});
