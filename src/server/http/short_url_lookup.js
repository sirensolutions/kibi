import crypto from 'crypto';

export default function (server) {
  async function updateMetadata(urlId, urlDoc, req) {
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
    const kibanaIndex = server.config().get('kibana.index');

    try {
      await callWithRequest(req, 'update', {
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

  async function getUrlDoc(urlId, req) {
    const urlDoc = await new Promise((resolve, reject) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const kibanaIndex = server.config().get('kibana.index');

      callWithRequest(req, 'get', {
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

  async function createUrlDoc(url, kibiSession, urlId, req) {
    const newUrlId = await new Promise((resolve, reject) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const kibanaIndex = server.config().get('kibana.index');

      callWithRequest(req, 'index', {
        index: kibanaIndex,
        type: 'url',
        id: urlId,
        body: {
          url,
          kibiSession,
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

  function createUrlId(url, kibiSession) {
    const urlId = crypto.createHash('md5')
    .update(url)
    .update(kibiSession !== undefined ? JSON.stringify(kibiSession, null, '') : '')
    .digest('hex');
    return urlId;
  }

  return {
    async generateUrlId(url, kibiSession, req) {
      const urlId = createUrlId(url, kibiSession);
      const urlDoc = await getUrlDoc(urlId, req);
      if (urlDoc) return urlId;

      return createUrlDoc(url, kibiSession, urlId, req);
    },
    async getUrl(urlId, req) {
      try {
        const urlDoc = await getUrlDoc(urlId, req);
        if (!urlDoc) throw new Error('Requested shortened url does not exist in kibana index');
        updateMetadata(urlId, urlDoc, req);
        return {
          url: urlDoc._source.url,
          kibiSession: urlDoc._source.kibiSession
        };
      } catch (err) {
        return '/';
      }
    }
  };
};
