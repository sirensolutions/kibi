import sinon from 'sinon';
import expect from 'expect.js';
import { SavedObjectsClient } from '../saved_objects_client';
import { SavedObject } from '../saved_object';

describe('SavedObjectsClient', () => {
  const basePath = Math.random().toString(36).substring(7);
  const sandbox = sinon.sandbox.create();
  const doc = {
    id: 'AVwSwFxtcMV38qjDZoQg',
    type: 'config',
    attributes: { title: 'Example title' },
    version: 2
  };
  const docHit = {
    _id: 'AVwSwFxtcMV38qjDZoQg',
    _type: 'config',
    _source: { title: 'Example title' },
    _version: 2
  };

  let savedObjectsClient;
  let $http;
  let savedObjectApi;

  const object = { id: 'logstash-*', type: 'index-pattern', title: 'Test' };

  beforeEach(() => {
    // kibi: added by kibi
    savedObjectApi = {
      get:  sinon.stub().returns(Promise.resolve(docHit)),
      delete: sinon.stub().returns(Promise.resolve({ data: 'api-response' })),
      update: sinon.stub().returns(Promise.resolve({ data: 'api-response' })),
      index: sinon.stub().returns(Promise.resolve({ data: 'api-response' })),
      search: sinon.stub().returns(Promise.resolve({ data: { saved_objects: [object] } }))
    };
    // kibi: end
    $http = sandbox.stub();
    // kibi: pass savedObjectApi
    savedObjectsClient = new SavedObjectsClient($http, basePath, Promise, savedObjectApi);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#_getUrl', () => {
    it('returns without arguments', () => {
      const url = savedObjectsClient._getUrl();
      const expected = `${basePath}/api/saved_objects/`;

      expect(url).to.be(expected);
    });

    it('appends path', () => {
      const url = savedObjectsClient._getUrl(['some', 'path']);
      const expected = `${basePath}/api/saved_objects/some/path`;

      expect(url).to.be(expected);
    });

    it('appends query', () => {
      const url = savedObjectsClient._getUrl(['some', 'path'], { foo: 'Foo', bar: 'Bar' });
      const expected = `${basePath}/api/saved_objects/some/path?foo=Foo&bar=Bar`;

      expect(url).to.be(expected);
    });
  });

  describe('#_request', () => {
    const params = { foo: 'Foo', bar: 'Bar' };

    it('passes options to $http', () => {
      $http.withArgs({
        method: 'POST',
        url: '/api/path',
        data: params
      }).returns(Promise.resolve({ data: '' }));

      savedObjectsClient._request('POST', '/api/path', params);

      expect($http.calledOnce).to.be(true);
    });

    it('throws error when body is provided for GET', async () => {
      try {
        await savedObjectsClient._request('GET', '/api/path', params);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql('body not permitted for GET requests');
      }
    });

    it('catches API error', async () => {
      const message = 'Request failed';
      $http.returns(Promise.reject({ data: { error: message } }));

      try {
        await savedObjectsClient._request('POST', '/api/path', params);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql(message);
      }
    });

    it('catches API error status', async () => {
      $http.returns(Promise.reject({ status: 404 }));

      try {
        await savedObjectsClient._request('POST', '/api/path', params);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql('404 Response');
      }
    });
  });

  describe('#get', () => {
    it('returns a promise', () => {
      expect(savedObjectsClient.get('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.get();
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('requires id', async () => {
      try {
        await savedObjectsClient.get('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('resolves with instantiated SavedObject', async () => {
      const response = await savedObjectsClient.get(doc.type, doc.id);
      expect(response.type).to.eql('config');
      expect(response.attributes.title).to.eql('Example title');
    });

    it('makes HTTP call', async () => {
      await savedObjectsClient.get(doc.type, doc.id);
      sinon.assert.calledOnce(savedObjectApi.get);
    });
  });

  describe('#delete', () => {

    it('returns a promise', () => {
      expect(savedObjectsClient.delete('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.delete();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('requires id', async () => {
      try {
        await savedObjectsClient.delete('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('makes HTTP call', () => {
      savedObjectsClient.delete('index-pattern', 'logstash-*');
      sinon.assert.calledOnce(savedObjectApi.delete);
    });
  });

  describe('#update', () => {
    const requireMessage = 'requires type, id and attributes';

    it('returns a promise', () => {
      expect(savedObjectsClient.update('index-pattern', 'logstash-*', {})).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.update();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('requires id', async () => {
      try {
        await savedObjectsClient.update('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('requires attributes', async () => {
      try {
        await savedObjectsClient.update('index-pattern', 'logstash-*');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      const body = { doc: attributes, version: 2 };
      const options = { version: 2 };

      savedObjectsClient.update('index-pattern', 'logstash-*', attributes, options);
      sinon.assert.calledOnce(savedObjectApi.update);

      expect(savedObjectApi.update.getCall(0).args[0].body).to.eql(body);
    });
  });

  describe('#create', () => {
    const requireMessage = 'requires type and attributes';

    it('returns a promise', () => {
      expect(savedObjectsClient.create('index-pattern', {})).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.create();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('allows for id to be provided', () => {
      const url = `${basePath}/api/saved_objects/index-pattern/myId`;
      const attributes = { foo: 'Foo', bar: 'Bar', url: url };

      savedObjectsClient.create('index-pattern', attributes, { id: 'myId' });

      sinon.assert.calledOnce(savedObjectApi.index);
      expect(savedObjectApi.index.getCall(0).args[0].body.url).to.eql(url);
    });

    it('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      savedObjectsClient.create('index-pattern', attributes);

      sinon.assert.calledOnce(savedObjectApi.index);
      expect(savedObjectApi.index.getCall(0).args[0].body).to.eql(attributes);
    });
  });

  describe('#find', () => {
    it('returns a promise', () => {
      expect(savedObjectsClient.find()).to.be.a(Promise);
    });

    it('accepts type', () => {
      const body = { type: 'index-pattern', invalid: true };

      savedObjectsClient.find(body);
      expect(savedObjectApi.search.calledOnce).to.be(true);
      const options = savedObjectApi.search.getCall(0).args[0];
      expect(options.type).to.eql('index-pattern');
    });

    it('accepts fields', () => {
      const body = { index: '.siren' };

      savedObjectsClient.find(body);
      expect(savedObjectApi.search.calledOnce).to.be(true);
      const options = savedObjectApi.search.getCall(0).args[0];
      expect(options.index).to.eql('.siren');
    });
  });
});
