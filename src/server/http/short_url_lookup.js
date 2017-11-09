import crypto from 'crypto';
import { get } from 'lodash';

export default function (server) {

  // kibi: returns the model
  function getModel() {
    return server.plugins.saved_objects_api.getModel('url');
  }
  // kibi: end

  async function updateMetadata(urlId, urlDoc, req) {
    // kibi: use the saved objects API to update the URL
    try {
      await getModel().patch(urlId, {
        accessDate: new Date(),
        accessCount: urlDoc._source.accessCount + 1
      }, req);
      // kibi: end
    } catch (err) {
      server.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  async function getUrlDoc(urlId, req) {
    // kibi: use the saved objects API to get the URL
    try {
      return await getModel().get(urlId, req);
    } catch (error) {
      return null;
    }
    // kibi: end
  }

  async function createUrlDoc(url, sirenSession, urlId, req) {
    // kibi: use the saved objects API to create the URL
    try {
      const response = await getModel().create(urlId, {
        url,
        sirenSession,
        accessCount: 0,
        createDate: new Date(),
        accessDate: new Date()
      }, req);
      return response._id;
    } catch (error) {
      throw error;
    }
    // kibi: end
  }

  function createUrlId(url, sirenSession) {
    const urlId = crypto.createHash('md5')
    .update(url)
    .update(sirenSession !== undefined ? JSON.stringify(sirenSession, null, '') : '')
    .digest('hex');

    return urlId;
  }

  return {
    async generateUrlId(url, sirenSession, req) {
      const urlId = createUrlId(url, sirenSession);
      const urlDoc = await getUrlDoc(urlId, req);
      if (urlDoc) return urlId;

      return createUrlDoc(url, sirenSession, urlId, req);
    },

    async getUrl(id, req) {
      try {
        const doc = await getUrlDoc(id, req);
        updateMetadata(id, doc, req);

        // kibi: returns an object with url and sirenSession instead of a url string
        return {
          url: doc._source.url,
          sirenSession: doc._source.sirenSession
        };
      } catch (err) {
        return '/';
      }
    }
  };
}
