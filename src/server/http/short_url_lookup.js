import crypto from 'crypto';

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
    async getUrl(urlId, req) {
      try {
        const urlDoc = await getUrlDoc(urlId, req);
        if (!urlDoc) throw new Error('Requested shortened url does not exist in kibana index');

        updateMetadata(urlId, urlDoc, req);

        return {
          url: urlDoc._source.url,
          sirenSession: urlDoc._source.sirenSession
        };
      } catch (err) {
        return '/';
      }
    }
  };
}
