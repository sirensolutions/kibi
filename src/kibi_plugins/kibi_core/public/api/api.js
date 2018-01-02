import Promise from 'bluebird';
import { uiModules } from 'ui/modules';
import 'ui/notify';

uiModules
.get('kibana')
.service('kibiEmbeddingAPI', function ($injector, $window) {
  /**
   * Provides Kibi functions to embedding apps.
   */
  class KibiEmbeddingAPI {
    constructor(deprecated) {
      this.deprecated = deprecated;
    }

    getDeprecatedInstance() {
      return new KibiEmbeddingAPI(true);
    }

    deprecationLogger() {
      if(this.deprecated) {
        console.warn('[KibiEmbeddingAPI] window.kibi is deprecated and will change to window.investigate in a later version');
      }
    }
    /**
     * Generates a short URL for the current state.
     *
     * @param {Boolean} shareAsEmbed - Set to true to enable embedding in the URL.
     * @param {Boolean} displayNavBar - Set to true to display the Kibi navigation bar when embedding is enabled in the URL.
     * @returns {Promise} - Resolved with the short URL.
     */
    async generateShortUrl(shareAsEmbed, displayNavBar) {
      this.deprecationLogger();
      // NOTE: try get the sharingService via $injector
      // as e.g. on status page it is not autoloaded
      if ($injector.has('sharingService')) {
        const sharingService = $injector.get('sharingService');
        const url = await sharingService.generateShortUrl();
        return sharingService.addParamsToUrl(url, shareAsEmbed, displayNavBar);
      }
      return Promise.reject(new Error('SharingService not available'));
    }

    /**
     * Validates a JWT token and stores it in the Kibi session cookie.
     *
     * @param token - A valid JWT token.
     * @returns {Promise} - Resolved with true if token authentication was successful, an Error otherwise.
     */
    async setJWTToken(token) {
      this.deprecationLogger();
      const kacService = $injector.get('kibiAccessControl');
      return await kacService.login({
        header: 'authorization',
        value: token
      });
    }

  }

  return new KibiEmbeddingAPI();
})
.run((kibiEmbeddingAPI, $window) => {
  $window.kibi = kibiEmbeddingAPI.getDeprecatedInstance();
  $window.investigate = kibiEmbeddingAPI;
});
