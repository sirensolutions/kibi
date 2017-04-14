const crypto = require('crypto');

export default function (server) {
  async function updateMetadata(urlId, urlDoc) {
    const client = server.plugins.elasticsearch.client;
    const kibanaIndex = server.config().get('kibana.index');

    try {
      await client.update({
        index: kibanaIndex,
        type: 'url',
        id: urlId,
        body: {
          doc: {
            'accessDate': new Date(),
            'accessCount': urlDoc._source.accessCount + 1
          }
        }
      });
    } catch (err) {
      server.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  async function getUrlDoc(urlId) {
    const urlDoc = await new Promise((resolve, reject) => {
      const client = server.plugins.elasticsearch.client;
      const kibanaIndex = server.config().get('kibana.index');

      client.get({
        index: kibanaIndex,
        type: 'url',
        id: urlId
      })
      .then(response => {
        resolve(response);
      })
      .catch(err => {
        resolve();
      });
    });

    return urlDoc;
  }

  async function createUrlDoc(url, sirenSession, urlId) {
    const newUrlId = await new Promise((resolve, reject) => {
      const client = server.plugins.elasticsearch.client;
      const kibanaIndex = server.config().get('kibana.index');

      client.index({
        index: kibanaIndex,
        type: 'url',
        id: urlId,
        body: {
          url,
          sirenSession,
          'accessCount': 0,
          'createDate': new Date(),
          'accessDate': new Date()
        }
      })
      .then(response => {
        resolve(response._id);
      })
      .catch(err => {
        reject(err);
      });
    });

    return newUrlId;
  }

  function createUrlId(url, sirenSession) {
    const urlId = crypto.createHash('md5')
    .update(url)
    .update(sirenSession !== undefined ? JSON.stringify(sirenSession, null, '') : '')
    .digest('hex');
    return urlId;
  }

  return {
    async generateUrlId(payload) {
      const urlId = createUrlId(payload.url, payload.sirenSession);
      const urlDoc = await getUrlDoc(urlId);
      if (urlDoc) return urlId;

      return createUrlDoc(payload.url, payload.sirenSession, urlId);
    },
    async getUrl(urlId) {
      try {
        const urlDoc = await getUrlDoc(urlId);
        if (!urlDoc) throw new Error('Requested shortened url does note exist in kibana index');
        updateMetadata(urlId, urlDoc);
        return {
          url: urlDoc._source.url,
          sirenSession: urlDoc._source.sirenSession
        };
      } catch (err) {
        return '/';
      }
    }
  };
};
