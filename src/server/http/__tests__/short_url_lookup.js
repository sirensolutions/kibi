import expect from 'expect.js';
import sinon from 'sinon';
import shortUrlLookupProvider from '../short_url_lookup';
import { SavedObjectsClient } from '../../saved_objects/client';

import { createEsTestCluster } from '../../../../src/test_utils/es';
import * as kbnTestServer from '../../../../src/test_utils/kbn_server';

describe('shortUrlLookupProvider', () => {
  const ID = 'bf00ad16941fc51420f91a93428b27a0';
  const TYPE = 'url';
  const URL = 'http://elastic.co';
  const sandbox = sinon.sandbox.create();

  let savedObjectsClient;
  let req;
  let shortUrl;

  let kbnServer;

  const es = createEsTestCluster({
    name: 'short_url_lookup',
  });

  before(async function () {
    this.timeout(es.getStartTimeout());
    await es.start();

    const client = es.getClient();

    kbnServer = kbnTestServer.createServerWithCorePlugins();
    await kbnServer.ready();
    await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  });

  after(async function () {
    await kbnServer.close();
    await es.stop();
  });

  beforeEach(() => {
    savedObjectsClient = {
      get: sandbox.stub(),
      create: sandbox.stub().returns(Promise.resolve({ id: ID })),
      update: sandbox.stub(),
      errors: SavedObjectsClient.errors
    };

    req = { getSavedObjectsClient: () => savedObjectsClient };
    shortUrl = shortUrlLookupProvider(kbnServer.server);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('generateUrlId', () => {
    it('returns the document id', async () => {
      const id = await shortUrl.generateUrlId(URL, req);
      expect(id).to.eql(ID);
    });

    it('provides correct arguments to savedObjectsClient', async () => {
      await shortUrl.generateUrlId(URL, req);

      sinon.assert.calledOnce(savedObjectsClient.create);
      const [type, attributes, options] = savedObjectsClient.create.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(attributes).to.only.have.keys('url', 'accessCount', 'createDate', 'accessDate', 'sirenSession');
      expect(attributes.url).to.eql(URL);
      expect(options.id).to.eql(ID);
    });

    it('passes persists attributes', async () => {
      await shortUrl.generateUrlId(URL, req);

      sinon.assert.calledOnce(savedObjectsClient.create);
      const [type, attributes] = savedObjectsClient.create.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(attributes).to.only.have.keys('url', 'accessCount', 'createDate', 'accessDate', 'sirenSession');
      expect(attributes.url).to.eql(URL);
    });

    it('gracefully handles version conflict', async () => {
      const error = savedObjectsClient.errors.decorateConflictError(new Error());
      savedObjectsClient.create.throws(error);
      const id = await shortUrl.generateUrlId(URL, req);
      expect(id).to.eql(ID);
    });
  });

  describe('getUrl', () => {
    beforeEach(() => {
      const attributes = { accessCount: 2, url: URL };
      savedObjectsClient.get.returns({ id: ID, attributes });
    });

    it('provides the ID to savedObjectsClient', async () => {
      await shortUrl.getUrl(ID, req);

      sinon.assert.calledOnce(savedObjectsClient.get);
      const [type, id] = savedObjectsClient.get.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(id).to.eql(ID);
    });

    it('returns the url', async () => {
      const response = await shortUrl.getUrl(ID, req);
      expect(response).to.eql(URL);
    });

    it('increments accessCount', async () => {
      await shortUrl.getUrl(ID, req);

      sinon.assert.calledOnce(savedObjectsClient.update);
      const [type, id, attributes] = savedObjectsClient.update.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(id).to.eql(ID);
      expect(attributes).to.only.have.keys('accessCount', 'accessDate');
      expect(attributes.accessCount).to.eql(3);
    });
  });
});
