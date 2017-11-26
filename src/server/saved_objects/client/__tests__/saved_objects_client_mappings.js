import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';

import { SavedObjectsClient } from '../saved_objects_client';
import { decorateEsError } from '../lib';
const { BadRequest } = elasticsearch.errors;

// kibi: added by kibi
import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { createEsTestCluster } from '../../../../test_utils/es';
// kibi: end

describe('SavedObjectsClient', () => {
  let callAdminCluster;
  let savedObjectsClient;
  const illegalArgumentException = { type: 'type_missing_exception' };

  // kibi: added by kibi
  let modelStub;
  let indexStub;
  let updateStub;
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


  describe('mapping', () => {
    beforeEach(() => {
      callAdminCluster = sinon.stub();
      // kibi: saved_objects_api is added
      savedObjectsClient = new SavedObjectsClient('.kibana-test', {}, callAdminCluster, kbnServer.server.plugins.saved_objects_api);
    });

    afterEach(() => {
      callAdminCluster.reset();
      modelStub.restore();
    });


    describe('#create', () => {
      it('falls back to single-type mapping', async () => {
        const error = decorateEsError(new BadRequest('[illegal_argument_exception] Rejecting mapping update to [.kibana-v6]', {
          body: {
            error: illegalArgumentException
          }
        }));

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

      it('prepends id for single-type', async () => {
        const id = 'foo';
        const error = decorateEsError(new BadRequest('[illegal_argument_exception] Rejecting mapping update to [.kibana-v6]', {
          body: {
            error: illegalArgumentException
          }
        }));

        const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
        const response = await savedObjectsClient.create('test-type', { title: 'test-title' }, { id });

        expect(withKibanaIndexSpy.getCall(1).args[1].id).to.eql('test-type:foo');
      });
    });

    describe('#bulkCreate', () => {
      const firstResponse = {
        errors: true,
        items: [{
          create: {
            _type: 'config',
            _id: 'one',
            _version: 2,
            status: 400,
            error: illegalArgumentException
          }
        }, {
          create: {
            _type: 'index-pattern',
            _id: 'two',
            _version: 2,
            status: 400,
            error: illegalArgumentException
          }
        }]
      };

      const secondResponse = {
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
      };

      it('falls back to single-type mappings', async () => {
        callAdminCluster
          .onFirstCall().returns(Promise.resolve(firstResponse))
          .onSecondCall().returns(Promise.resolve(secondResponse));

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

      it('prepends id for single-type', async () => {
        callAdminCluster
          .onFirstCall().returns(Promise.resolve(firstResponse))
          .onSecondCall().returns(Promise.resolve(secondResponse));

        await savedObjectsClient.bulkCreate([
          { type: 'config', id: 'one', attributes: { title: 'Test One' } },
          { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
        ]);

        const [, { body }] = callAdminCluster.getCall(1).args;
        expect(body[0].create._id).to.eql('config:one');
        expect(body[2].create._id).to.eql('index-pattern:two');
        // expect(args.id).to.eql('index-pattern:foo');
      });
    });

    describe('update', () => {
      const id = 'logstash-*';
      const type = 'index-pattern';
      const version = 2;
      const attributes = { title: 'Testing' };
      const error = decorateEsError(new BadRequest('[document_missing_exception] [config][logstash-*]: document missing', {
        body: {
          error: {
            type: 'document_missing_exception'
          }
        }
      }));


      it('falls back to single-type mappings', async () => {
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

      it('prepends id for single-type', async () => {
        const withKibanaIndexSpy = sinon.spy(savedObjectsClient, '_withKibanaIndex');
        const response = await savedObjectsClient.update('test-type', 'logstash-*', attributes);

        expect(withKibanaIndexSpy.getCall(1).args[1].id).to.eql('test-type:logstash-*');
      });
    });
  });
});
