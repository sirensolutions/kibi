import expect from 'expect.js';
import sinon from 'sinon';
import { SavedObjectsClient } from '../saved_objects_client';
import { createIdQuery } from '../lib/create_id_query';
// kibi: added by kibi
import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { createEsTestCluster } from '../../../../test_utils/es';
// kibi: end

describe('SavedObjectsClient', () => {
  let callAdminCluster;
  let savedObjectsClient;
  const docs = {
    hits: {
      total: 3,
      hits: [{
        _index: '.kibana',
        _type: 'index-pattern',
        _id: 'logstash-*',
        _score: 1,
        _source: {
          title: 'logstash-*',
          timeFieldName: '@timestamp',
          notExpandable: true
        }
      }, {
        _index: '.kibana',
        _type: 'config',
        _id: '6.0.0-alpha1',
        _score: 1,
        _source: {
          buildNum: 8467,
          defaultIndex: 'logstash-*'
        }
      }, {
        _index: '.kibana',
        _type: 'index-pattern',
        _id: 'stocks-*',
        _score: 1,
        _source: {
          title: 'stocks-*',
          timeFieldName: '@timestamp',
          notExpandable: true
        }
      }]
    }
  };

  const mappings = {
    'index-pattern': {
      properties: {
        someField: {
          type: 'keyword'
        }
      }
    }
  };

  // kibi: added by kibi
  let modelStub;
  let indexStub;
  let updateStub;
  let createStub;
  let deleteStub;
  let searchStub;
  let getStub;

  let kbnServer;
  const es = createEsTestCluster({
    name: 'server/http',
  });

  before(async function () {
    this.timeout(es.getStartTimeout());
    await es.start();
    kbnServer = kbnTestServer.createServerWithCorePlugins();
    await kbnServer.ready();
    await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  });

  after(async () => {
    await kbnServer.close();
    await es.stop();
  });
  // kibi: end

  beforeEach(() => {
    callAdminCluster = sinon.mock();
    // kibi: saved_objects_api is added
    savedObjectsClient = new SavedObjectsClient('.kibana-test', mappings, callAdminCluster, kbnServer.server.plugins.saved_objects_api);
  });

  afterEach(() => {
    callAdminCluster.reset();
    modelStub.restore();
  });


  describe('#create', () => {

    afterEach(() => {
      modelStub.restore();
    });

    it('formats Elasticsearch response', async () => {
      // kibi: kibi uses savedObjectApi
      indexStub = sinon.stub().returns(Promise.resolve({ _type: 'index-pattern', _id: 'logstash-*', _version: 2 }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ index: indexStub });
      // kibi: end

      const response = await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      });

      expect(response).to.eql({
        type: 'index-pattern',
        id: 'logstash-*',
        version: 2,
        attributes: {
          title: 'Logstash',
        }
      });
    });

    it('should use ES index action', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');

      await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      });
      const args = withKibanaIndexSpy.getCall(0).args;

      expect(withKibanaIndexSpy.calledOnce).to.be(true);
      expect(args[0]).to.be('index');
    });

    it('should use create action if ID defined and overwrite=false', async () => {
      // kibi: kibi uses savedObjectApi
      createStub = sinon.stub().returns(Promise.resolve({ _type: 'index-pattern', _id: 'logstash-*', _version: 2 }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ create: createStub });
      // kibi: end
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');

      await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      }, {
        id: 'logstash-*',
      });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const args = withKibanaIndexSpy.getCall(0).args;
      expect(args[0]).to.be('create');
    });

    it('allows for id to be provided', async () => {
      // kibi: kibi uses savedObjectApi
      createStub = sinon.stub().returns(Promise.resolve({ _type: 'index-pattern', _id: 'logstash-*', _version: 2 }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ create: createStub });
      // kibi: end
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');

      await savedObjectsClient.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash'
      }, { id: 'myId' });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const args = withKibanaIndexSpy.getCall(0).args;
      expect(args[1].id).to.be('myId');
    });
  });

  describe('#bulkCreate', () => {
    it('formats Elasticsearch request', async () => {
      await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;

      expect(args[0]).to.be('bulk');
      expect(args[1].body).to.eql([
        { create: { _type: 'config', _id: 'one' } },
        { title: 'Test One' },
        { create: { _type: 'index-pattern', _id: 'two' } },
        { title: 'Test Two' }
      ]);
    });

    it('should overwrite objects if overwrite is truthy', async () => {
      await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ], { overwrite: true });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;

      expect(args[0]).to.be('bulk');
      expect(args[1].body).to.eql([
        { index: { _type: 'config', _id: 'one' } },
        { title: 'Test One' },
        { index: { _type: 'index-pattern', _id: 'two' } },
        { title: 'Test Two' }
      ]);
    });

    it('returns document errors', async () => {
      callAdminCluster.returns(Promise.resolve({
        errors: false,
        items: [{
          create: {
            _type: 'config',
            _id: 'one',
            error: {
              reason: 'type[config] missing'
            }
          }
        }, {
          create: {
            _type: 'index-pattern',
            _id: 'two',
            _version: 2
          }
        }]
      }));

      const response = await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(response).to.eql([
        {
          id: 'one',
          type: 'config',
          version: undefined,
          attributes: { title: 'Test One' },
          error: { message: 'type[config] missing' }
        }, {
          id: 'two',
          type: 'index-pattern',
          version: 2,
          attributes: { title: 'Test Two' },
          error: undefined
        }
      ]);
    });

    it('formats Elasticsearch response', async () => {
      callAdminCluster.returns(Promise.resolve({
        errors: false,
        items: [{
          create: {
            _type: 'config',
            _id: 'one',
            _version: 2
          }
        }, {
          create: {
            _type: 'index-pattern',
            _id: 'two',
            _version: 2
          }
        }]
      }));

      const response = await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(response).to.eql([
        {
          id: 'one',
          type: 'config',
          version: 2,
          attributes: { title: 'Test One' },
          error: undefined
        }, {
          id: 'two',
          type: 'index-pattern',
          version: 2,
          attributes: { title: 'Test Two' },
          error: undefined
        }
      ]);
    });
  });

  describe('#delete', () => {
    it('throws notFound when ES is unable to find the document', (done) => {
      // kibi: kibi uses savedObjectApi
      deleteStub = sinon.stub().returns(Promise.resolve({
        deleted: 0
      }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ delete: deleteStub });
      // kibi: end

      savedObjectsClient.delete('index-pattern', 'logstash-*').then(() => {
        done('failed');
      }).catch(e => {
        expect(e.output.statusCode).to.be(404);
        done();
      });
    });

    it('passes the parameters to callAdminCluster', async () => {
      // kibi: kibi uses savedObjectApi
      deleteStub = sinon.stub().returns(Promise.resolve({
        deleted: 1
      }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ delete: deleteStub });
      // kibi: end
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.delete('index-pattern', 'logstash-*');

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const args = withKibanaIndexSpy.getCall(0).args;
      expect(args[0]).to.be('delete');
      expect(args[1]).to.eql({
        type: 'index-pattern',
        id: 'logstash-*',
        refresh: 'wait_for',
      });
    });
  });

  describe('#find', () => {
    it('formats Elasticsearch response', async () => {
      const count = docs.hits.hits.length;

      searchStub = sinon.stub().returns((Promise.resolve(docs)));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ search: searchStub });
      const response = await savedObjectsClient.find();

      expect(response.total).to.be(count);
      expect(response.saved_objects).to.have.length(count);
      docs.hits.hits.forEach((doc, i) => {
        expect(response.saved_objects[i]).to.eql({
          id: doc._id,
          type: doc._type,
          version: doc._version,
          attributes: doc._source
        });
      });
    });

    it('accepts per_page/page', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.find({ type: 'doc', perPage: 10, page: 6 });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const options = withKibanaIndexSpy.getCall(0).args[1];
      expect(options.size).to.be(10);
      expect(options.from).to.be(50);
    });

    it('accepts type', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.find({ type: 'index-pattern' });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const options = withKibanaIndexSpy.getCall(0).args[1];
      const expectedQuery = {
        bool: {
          must: [{ match_all: {} }],
          filter: [
            {
              bool: {
                should: [
                  {
                    term: {
                      _type: 'index-pattern'
                    }
                  }, {
                    term: {
                      type: 'index-pattern'
                    }
                  }
                ]
              }
            }
          ]
        }
      };

      expect(options.body).to.eql({
        query: expectedQuery, version: true
      });
    });

    it('throws error when providing sortField but no type', (done) => {
      savedObjectsClient.find({
        sortField: 'someField'
      }).then(() => {
        done('failed');
      }).catch(e => {
        expect(e).to.be.an(Error);
        done();
      });
    });

    it('accepts sort with type', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.find({
        type: 'index-pattern',
        sortField: 'someField',
        sortOrder: 'desc',
      });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const options = withKibanaIndexSpy.getCall(0).args[1];
      const expectedQuerySort = [
        {
          someField: {
            order: 'desc',
            unmapped_type: 'keyword'
          },
        }, {
          'index-pattern.someField': {
            order: 'desc',
            unmapped_type: 'keyword'
          },
        },
      ];

      expect(options.body.sort).to.eql(expectedQuerySort);
    });

    it('can filter by fields', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.find({ type: 'doc', fields: 'title' });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const options = withKibanaIndexSpy.getCall(0).args[1];
      expect(options._source).to.eql([
        'doc.title', 'type', 'title'
      ]);
    });
  });

  describe('#get', () => {
    it('formats Elasticsearch response', async () => {
      getStub = sinon.stub().returns(Promise.resolve({
        _id: 'logstash-*',
        _type: 'index-pattern',
        _version: 2,
        _source: {
          title: 'Testing'
        }
      }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ get: getStub });

      const response = await savedObjectsClient.get('index-pattern', 'logstash-*');
      expect(response).to.eql({
        id: 'logstash-*',
        type: 'index-pattern',
        version: 2,
        attributes: {
          title: 'Testing'
        }
      });
    });
  });

  describe('#bulkGet', () => {
    it('accepts an array of mixed type and ids', async () => {
      await savedObjectsClient.bulkGet([
        { id: 'one', type: 'config' },
        { id: 'two', type: 'index-pattern' }
      ]);

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options.body).to.eql([
        {},
        createIdQuery({ type: 'config', id: 'one' }),
        {},
        createIdQuery({ type: 'index-pattern', id: 'two' })
      ]);
    });

    it('returns early for empty objects argument', async () => {
      const response = await savedObjectsClient.bulkGet([]);

      expect(response.saved_objects).to.have.length(0);
      expect(callAdminCluster.notCalled).to.be(true);
    });

    it('reports error on missed objects', async () => {
      callAdminCluster.returns(Promise.resolve({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'good',
                  _type: 'doc',
                  _version: 2,
                  _source: {
                    type: 'config',
                    config: {
                      title: 'Test'
                    }
                  }
                }
              ]
            }
          }
        ]
      }));

      const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(
        [{ id: 'good', type: 'config' }, { id: 'bad', type: 'config' }]
      );

      expect(savedObjects).to.have.length(1);
      expect(savedObjects[0]).to.eql({
        id: 'good',
        type: 'config',
        version: 2,
        attributes: { title: 'Test' }
      });
    });
  });

  describe('#update', () => {
    it('returns current ES document version', async () => {
      const id = 'logstash-*';
      const type = 'index-pattern';
      const version = 2;
      const attributes = { title: 'Testing' };

      updateStub = sinon.stub().returns(Promise.resolve({
        _id: id,
        _type: type,
        _version: version,
        result: 'updated'
      }));
      modelStub = sinon.stub(savedObjectsClient._savedObjectsApi, 'getModel').returns({ update: updateStub });

      const response = await savedObjectsClient.update('index-pattern', 'logstash-*', attributes);
      expect(response).to.eql({
        id,
        type,
        version,
        attributes
      });
    });

    it('accepts version', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.update(
        'index-pattern',
        'logstash-*',
        { title: 'Testing' },
        { version: 1 }
      );

      const esParams = withKibanaIndexSpy.getCall(0).args[1];
      expect(esParams.version).to.be(1);
    });

    it('passes the parameters to callAdminCluster', async () => {
      const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
      await savedObjectsClient.update('index-pattern', 'logstash-*', { title: 'Testing' });

      expect(withKibanaIndexSpy.calledOnce).to.be(true);

      const args = withKibanaIndexSpy.getCall(0).args;

      expect(args[0]).to.be('update');
      expect(args[1]).to.eql({
        type: 'index-pattern',
        id: 'logstash-*',
        version: undefined,
        body: { title: 'Testing' },
        refresh: 'wait_for'
      });
    });
  });
});
