import expect from 'expect.js';

import {
  getServices,
  chance,
  assertDocMissingResponse,
  assertSinonMatch
} from './lib';

export function docMissingSuite() {
  async function setup() {
    const { kbnServer, uiSettings } = getServices();

    // kibi: use savedObjetsAPI instead of savedObjectsClient
    const req = { __stubHapiRequest: true, path: '', headers: {} };
    const savedObjetsAPI = kbnServer.server.plugins.saved_objects_api;
    const configModel = savedObjetsAPI.getModel('config');
    let config;
    try {
      config = await configModel.get('kibi', req);
    } catch (e) {
      // do nothing as there is nothing to delete
    }
    if (config) {
      await configModel.delete('kibi', req);
    }
    // kibi: end

    return { kbnServer };
  }

  describe('get route', () => {
    it('returns a 200 with empty values', async () => {
      const { kbnServer } = await setup();

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings'
      });

      expect(statusCode).to.be(200);
      expect(result).to.eql({ settings: {} });
    });
  });

  describe('set route', () => {
    // kibi: title changed from "returns a 200" to "returns a 200"
    it('returns a 200', async () => {
      const { kbnServer } = await setup();
      // kibi: in kibi if config does not exists it gets created and we return 200
      // so we use assertSinonMatch instead of assertDocMissingResponse
      const word = chance.word()
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: {
          value: word
        }
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          defaultIndex: {
            userValue: word
          }
        }
      });
      // kibi: end
    });
  });

  describe('setMany route', () => {
    // kibi: title changed from "returns a 200" to "returns a 200"
    it('returns a 200', async () => {
      const { kbnServer } = await setup();
      // kibi: in kibi if config does not exists it gets created
      // so we use assertSinonMatch instead of assertDocMissingResponse
      const word = chance.word()
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: {
            defaultIndex: word
          }
        }
      });
      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          defaultIndex: {
            userValue: word
          }
        }
      });
      // kibi: end
    });
  });

  describe('delete route', () => {
    // kibi: title changed from "returns a 200" to "returns a 200"
    it('returns a 200', async () => {
      const { kbnServer } = await setup();
      // kibi: in kibi if config does not exists it gets created
      // so we use assertSinonMatch instead of assertDocMissingResponse
      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      });
      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {}
      });
      // kibi: end
    });
  });
}
