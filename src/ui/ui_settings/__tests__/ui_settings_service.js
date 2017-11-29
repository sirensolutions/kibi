import { isEqual } from 'lodash';
import expect from 'expect.js';
import { errors as esErrors } from 'elasticsearch';
import Chance from 'chance';

import { UiSettingsService } from '../ui_settings_service';

import {
  createObjectsClientStub,
  savedObjectsClientErrors,
} from './lib';

// kibi: imports
import sinon from 'sinon';
import requirefrom from 'requirefrom';
// kibi: end

const TYPE = 'config';
const ID = 'kibana-version';
const chance = new Chance();

function setup(options = {}) {
  const {
    // kibi: added
    settingsStatusOverrides,
    callWithRequest,
    // kibi: end
    readInterceptor,
    getDefaults,
    defaults = {},
    esDocSource = {},
    // MERGE 5.6.4
    // savedObjectsClient is still used in some tests
    // have to review and either change the tests or refactor the code to use
    // our version of savedObjectsClient
    savedObjectsClient = createObjectsClientStub(TYPE, ID, esDocSource)
  } = options;

  // kibi: added by
  const adminCluster = {
    errors: esErrors,
    callWithInternalUser: sinon.stub(),
    callWithRequest: sinon.spy((withReq, method, params) => {
      if (callWithRequest) {
        return callWithRequest(withReq, method, params);
      }

      // kibi: handled by the saved_objects_api
      //expect(withReq).to.be(req);
      switch (method) {
        case 'get':
          return Promise.resolve({ _source: esDocSource, found: true });
        case 'update':
          return Promise.resolve();
        default:
          throw new Error(`callWithRequest() is using unexpected method "${method}"`);
      }
    })
  };

  adminCluster.callWithInternalUser.withArgs('get', sinon.match.any).returns(Promise.resolve({ _source: esDocSource }));
  adminCluster.callWithInternalUser.withArgs('update', sinon.match.any).returns(Promise.resolve());

  const configGet = sinon.stub();
  configGet.withArgs('kibana.index').returns('.kibana');
  configGet.withArgs('pkg.version').returns('1.2.3-test');
  // kibi: configuration id is taken from kibi_version
  configGet.withArgs('pkg.kibiVersion').returns('1.2.3-test');

  configGet.withArgs('uiSettings.enabled').returns(true);
  const config = {
    get: configGet
  };

  const server = {
    config() {
      return config;
    },
    decorate: (_, key, value) => server[key] = value,
    plugins: {
      saved_objects_api: {
        status: {
          state: 'green'
        },
        getMiddlewares: () => []
      },
      elasticsearch: {
        getCluster: sinon.stub().withArgs('admin').returns(adminCluster)
      }
    }
  };

  const ConfigModel = requirefrom('src/kibi_plugins/saved_objects_api/lib/model/builtin/')('config');
  server.plugins.saved_objects_api.getModel = sinon.stub().withArgs('config').returns(new ConfigModel(server));

  const req = { __stubHapiRequest: true, path: '', headers: {} };

  const esStatus = {
    state: 'green',
    on: sinon.spy()
  };

  const settingsStatus = {
    state: 'green',
    red: sinon.spy(),
    yellow: sinon.spy(),
    green: sinon.spy(),
    ...settingsStatusOverrides
  };

  const expectElasticsearchGetQuery = function () {
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
    sinon.assert.calledOnce(callWithRequest);
    const [reqPassed, method, params] = callWithRequest.args[0];
    // kibi: handled by the saved_objects_api
    //expect(reqPassed).to.be(req);
    expect(method).to.be('get');
    expect(params).to.eql({
      index: configGet('kibana.index'),
      id: 'kibi',
      type: 'config'
    });
  };

  const expectElasticsearchUpdateQuery = function (doc) {
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
    sinon.assert.calledOnce(callWithRequest);
    const [reqPassed, method, params] = callWithRequest.args[0];
    // kibi: handled by the saved_objects_api
    //expect(reqPassed).to.be(req);
    expect(method).to.be('update');
    expect(params).to.eql({
      index: configGet('kibana.index'),
      id: 'kibi',
      type: 'config',
      body: { doc },
      refresh: true
    });
  };
  // kibi: end

  const uiSettings = new UiSettingsService({
    type: TYPE,
    id: ID,
    getDefaults: getDefaults || (() => defaults),
    readInterceptor,
    savedObjectsClient,
    server,
    status: settingsStatus
  });

  return {
    uiSettings,
    // kibi: added
    req,
    configGet,
    server,
    // kibi: modified
    assertGetQuery: expectElasticsearchGetQuery, // kibi: changed before was savedObjectsClient.assertGetQuery
    assertUpdateQuery: expectElasticsearchUpdateQuery, // kibi: changed before was savedObjectsClient.assertUpdateQuery
  };
}

describe('ui settings', () => {
  describe('overview', () => {
    it('has expected api surface', () => {
      const { uiSettings } = setup();
      expect(uiSettings).to.have.property('get').a('function');
      expect(uiSettings).to.have.property('getAll').a('function');
      expect(uiSettings).to.have.property('getDefaults').a('function');
      expect(uiSettings).to.have.property('getRaw').a('function');
      expect(uiSettings).to.have.property('getUserProvided').a('function');
      expect(uiSettings).to.have.property('remove').a('function');
      expect(uiSettings).to.have.property('removeMany').a('function');
      expect(uiSettings).to.have.property('set').a('function');
      expect(uiSettings).to.have.property('setMany').a('function');
    });
  });

  // kibi:
  // all methods invokation modified as they all require a hapi "req" object now

  describe('#setMany()', () => {
    it('returns a promise', () => {
      const { uiSettings, req } = setup();
      expect(uiSettings.setMany(req, { a: 'b' })).to.be.a(Promise);
    });

    it('updates a single value in one operation', async () => {
      const { uiSettings, assertUpdateQuery, req } = setup();
      await uiSettings.setMany(req, { one: 'value' });
      assertUpdateQuery({ one: 'value' });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, assertUpdateQuery, req } = setup();
      await uiSettings.setMany(req, { one: 'value', another: 'val' });
      assertUpdateQuery({ one: 'value', another: 'val' });
    });

    // kibi: added tests
    describe('kibi', function () {
      it('should create the config singleton if it does not exist yet', async function () {
        const { server, uiSettings, configGet, req } = setup({
          async callWithRequest(req, method, params) {
            switch (method) {
              case 'update':
                // config object does not exist yet
                throw { status: 404 };
              case 'create':
                expect(params.index).to.eql(configGet('kibana.index'));
                expect(params.type).to.eql('config');
                expect(params.id).to.eql('kibi');
                expect(params.body).to.eql({ one: 'value' });
                break;
              default:
                throw new Error(`callWithRequest() is using unexpected method "${method}"`);
            }
          }
        });

        await uiSettings.setMany(req, { one: 'value' });

        const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
        sinon.assert.calledTwice(callWithRequest);
        sinon.assert.calledWith(callWithRequest.getCall(0), sinon.match.any, 'update');
        sinon.assert.calledWith(callWithRequest.getCall(1), sinon.match.any, 'create');
      });
    });
    // kibi: end
  });

  describe('#set()', () => {
    it('returns a promise', () => {
      const { uiSettings, req } = setup();
      expect(uiSettings.set(req, 'a', 'b')).to.be.a(Promise);
    });

    it('updates single values by (key, value)', async () => {
      const { uiSettings, assertUpdateQuery, req } = setup();
      await uiSettings.set(req, 'one', 'value');
      assertUpdateQuery({ one: 'value' });
    });
  });

  describe('#remove()', () => {
    it('returns a promise', () => {
      const { uiSettings, req } = setup();
      expect(uiSettings.remove(req, 'one')).to.be.a(Promise);
    });

    it('removes single values by key', async () => {
      const { uiSettings, assertUpdateQuery, req } = setup();
      await uiSettings.remove(req, 'one');
      assertUpdateQuery({ one: null });
    });
  });

  describe('#removeMany()', () => {
    it('returns a promise', () => {
      const { uiSettings, req } = setup();
      expect(uiSettings.removeMany(req, ['one'])).to.be.a(Promise);
    });

    it('removes a single value', async () => {
      const { uiSettings, assertUpdateQuery, req } = setup();
      await uiSettings.removeMany(req, ['one']);
      assertUpdateQuery({ one: null });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, assertUpdateQuery, req } = setup();
      await uiSettings.removeMany(req, ['one', 'two', 'three']);
      assertUpdateQuery({ one: null, two: null, three: null });
    });
  });

  describe('#getDefaults()', () => {
    it('returns a promise for the defaults', async () => {
      const { uiSettings } = setup();
      const promise = uiSettings.getDefaults();
      expect(promise).to.be.a(Promise);
      expect(await promise).to.eql({});
    });
  });

  describe('getDefaults() argument', () => {
    it('casts sync `getDefaults()` to promise', () => {
      const getDefaults = () => ({ key: { value: chance.word() } });
      const { uiSettings } = setup({ getDefaults });
      expect(uiSettings.getDefaults()).to.be.a(Promise);
    });

    it('returns the defaults returned by getDefaults() argument', async () => {
      const value = chance.word();
      const { uiSettings } = setup({ defaults: { key: { value } } });
      expect(await uiSettings.getDefaults()).to.eql({
        key: { value }
      });
    });
  });

  describe('#getUserProvided()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery, req } = setup({ esDocSource });
      await uiSettings.getUserProvided(req);
      assertGetQuery();
    });

    it('returns user configuration', async () => {
      const esDocSource = { user: 'customized' };
      const { uiSettings, req } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided(req);
      expect(isEqual(result, {
        user: { userValue: 'customized' }
      })).to.equal(true);
    });

    it('ignores null user configuration (because default values)', async () => {
      const esDocSource = { user: 'customized', usingDefault: null, something: 'else' };
      const { uiSettings, req } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided(req);
      expect(isEqual(result, {
        user: { userValue: 'customized' }, something: { userValue: 'else' }
      })).to.equal(true);
    });

    it('returns an empty object on 404 responses', async () => {
      const { uiSettings, req } = setup({
        async callCluster() {
          throw new esErrors[404]();
        }
      });

      expect(await uiSettings.getUserProvided(req)).to.eql({});
    });

    it('returns an empty object on 403 responses', async () => {
      const { uiSettings, req } = setup({
        async callCluster() {
          throw new esErrors[403]();
        }
      });

      expect(await uiSettings.getUserProvided(req)).to.eql({});
    });

    it('returns an empty object on NoConnections responses', async () => {
      const { uiSettings, req } = setup({
        async callCluster() {
          throw new esErrors.NoConnections();
        }
      });

      expect(await uiSettings.getUserProvided(req)).to.eql({});
    });

    it('throws 401 errors', async () => {
      const { uiSettings, req } = setup({
        // kibi: use callWithRequest instead of savedObjectsClient
        async callWithRequest() {
          throw new esErrors[401]();
        }
        // kibi: end
      });

      try {
        await uiSettings.getUserProvided(req);
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        // kibi: the error is wrapped by the savedObjetsAPI plugin
        expect(err.inner).to.be.a(esErrors[401]);
      }
    });

    it('throw when callCluster fails in some unexpected way', async () => {
      const expectedUnexpectedError = new Error('unexpected');

      const { uiSettings, req } = setup({
        // kibi: use callWithRequest instead of savedObjectsClient
        async callWithRequest() {
          throw expectedUnexpectedError;
        }
        // kibi: end
      });

      try {
        await uiSettings.getUserProvided(req);
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).to.be(expectedUnexpectedError);
      }
    });
  });

  describe('#getRaw()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery, req } = setup({ esDocSource });
      await uiSettings.getRaw(req);
      assertGetQuery();
    });

    it(`without user configuration it's equal to the defaults`, async () => {
      const esDocSource = {};
      const defaults = { key: { value: chance.word() } };
      const { uiSettings, req } = setup({ esDocSource, defaults });
      const result = await uiSettings.getRaw(req);
      expect(result).to.eql(defaults);
    });

    it(`user configuration gets merged with defaults`, async () => {
      const esDocSource = { foo: 'bar' };
      const defaults = { key: { value: chance.word() } };
      const { uiSettings, req } = setup({ esDocSource, defaults });
      const result = await uiSettings.getRaw(req);

      expect(result).to.eql({
        foo: {
          userValue: 'bar',
        },
        key: {
          value: defaults.key.value,
        },
      });
    });
  });

  describe('#getAll()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery, req } = setup({ esDocSource });
      // kibi: have to pass request object ot getAll()
      await uiSettings.getAll(req);
      assertGetQuery();
    });

    it(`returns defaults when es doc is empty`, async () => {
      const esDocSource = { };
      const defaults = { foo: { value: 'bar' } };
      const { uiSettings, req } = setup({ esDocSource, defaults });
      // MERGE 5.6 have to pass request object ot getAll()
      expect(await uiSettings.getAll(req)).to.eql({
        foo: 'bar'
      });
    });

    it(`merges user values, including ones without defaults, into key value pairs`, async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default'
        },
      };

      const { uiSettings, req } = setup({ esDocSource, defaults });
      // MERGE 5.6 have to pass request object ot getAll()
      expect(await uiSettings.getAll(req)).to.eql({
        foo: 'user-override',
        bar: 'user-provided',
      });
    });
  });

  describe('#get()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery, req } = setup({ esDocSource });
      await uiSettings.get(req);
      assertGetQuery();
    });

    it(`returns the promised value for a key`, async () => {
      const esDocSource = {};
      const defaults = { dateFormat: { value: chance.word() } };
      const { uiSettings, req } = setup({ esDocSource, defaults });
      const result = await uiSettings.get(req, 'dateFormat');
      expect(result).to.equal(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async () => {
      const esDocSource = { custom: 'value' };
      const { uiSettings, req } = setup({ esDocSource });
      const result = await uiSettings.get(req, 'custom');
      expect(result).to.equal('value');
    });

    it(`returns the user-configured value for a modified key`, async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings, req } = setup({ esDocSource });
      const result = await uiSettings.get(req, 'dateFormat');
      expect(result).to.equal('YYYY-MM-DD');
    });
  });

  describe('readInterceptor() argument', () => {
    describe('#getUserProvided()', () => {
      it('returns a promise when interceptValue doesn\'t', () => {
        const { uiSettings, req } = setup({ readInterceptor: () => ({}) });
        expect(uiSettings.getUserProvided(req)).to.be.a(Promise);
      });

      it('returns intercept values', async () => {
        const { uiSettings, req } = setup({
          readInterceptor: () => ({
            foo: 'bar'
          })
        });

        expect(await uiSettings.getUserProvided(req)).to.eql({
          foo: {
            userValue: 'bar'
          }
        });
      });
    });

    describe('#getAll()', () => {
      it('merges intercept value with defaults', async () => {
        const { uiSettings, req } = setup({
          defaults: {
            foo: { value: 'foo' },
            bar: { value: 'bar' },
          },

          readInterceptor: () => ({
            foo: 'not foo'
          }),
        });

        // MERGE 5.6 have to pass request object ot getAll()
        expect(await uiSettings.getAll(req)).to.eql({
          foo: 'not foo',
          bar: 'bar'
        });
      });
    });
  });
});
