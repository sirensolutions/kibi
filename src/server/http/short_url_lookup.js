import crypto from 'crypto';
import { get } from 'lodash';

export default function (server) {
  async function updateMetadata(doc, req) {
    try {
      await req.getSavedObjectsClient().update('url', doc.id, {
        accessDate: new Date(),
        accessCount: get(doc, 'attributes.accessCount', 0) + 1
      });
    } catch (err) {
      server.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  async function getUrlDoc(urlId, req) {
    // kibi: use the saved objects API to get the URL
    try {
      const savedObjectsClient = req.getSavedObjectsClient();
      return await savedObjectsClient.get('url', urlId, req);
    } catch (error) {
      return null;
    }
    // kibi: end
  }

  return {
    async generateUrlId(url, req, sirenSession = {}) {
      const id = crypto.createHash('md5').update(url).digest('hex');
      const savedObjectsClient = req.getSavedObjectsClient();
      const { isConflictError } = savedObjectsClient.errors;

      const urlDoc = await  getUrlDoc(id, req);
      if (urlDoc) return id;

      try {
        // kibi: pass request object to method
        const doc = await savedObjectsClient.create('url', {
          url,
          accessCount: 0,
          createDate: new Date(),
          accessDate: new Date(),
          sirenSession: sirenSession
        }, { id }, req);

        return doc.id;
      } catch (error) {
        if (isConflictError(error)) {
          return id;
        }

        throw error;
      }
    },

    async getUrl(id, req) {
      try {
        // kibi: pass request object to method
        const doc = await req.getSavedObjectsClient().get('url', id, req);
        updateMetadata(doc, req);

        return doc.attributes;
      } catch (err) {
        return '/';
      }
    }
  };
}
