import uiModules from 'ui/modules';
import { unhashUrl, getUnhashableStatesProvider } from 'ui/state_management/state_hashing';

uiModules
.get('kibana')
.service('sharingService', function (Private, $location) {

  const urlShortener = Private(require('./lib/url_shortener'));
  const getUnhashableStates = Private(getUnhashableStatesProvider);

  /**
   * Provides methods to share the current state.
   */
  class SharingService {

    /**
     * Returns the unhashed sharing URL for the current state.
     *
     * @param {Boolean} shareAsEmbed - Set to true to enable embedding in the URL.
     * @param {Boolean} displayNavBar - Set to true to display the Kibi navigation bar when embedding is enabled in the URL.
     * @returns {String} - The unhashed sharing URL.
     */
    getSharedUrl(shareAsEmbed, displayNavBar) {
      const urlWithHashes = $location.absUrl();
      let urlWithStates = unhashUrl(urlWithHashes, getUnhashableStates());
      if (shareAsEmbed) {
        if (displayNavBar) {
          urlWithStates = urlWithStates.replace('?', '?embed=true&kibiNavbarVisible=true&');
        } else {
          urlWithStates = urlWithStates.replace('?', '?embed=true&');
        }
      }
      return urlWithStates;
    }

    /**
     * Generates a short URL for the current state.
     *
     * @param {Boolean} shareAsEmbed - Set to true to enable embedding in the URL.
     * @param {Boolean} displayNavBar - Set to true to display the Kibi navigation bar when embedding is enabled in the URL.
     * @returns {Promise} - Resolved with the short URL.
     */
    async generateShortUrl(shareAsEmbed, displayNavBar) {
      return urlShortener.shortenUrl(this.getSharedUrl(shareAsEmbed, displayNavBar));
    }

  }

  return new SharingService();
});

