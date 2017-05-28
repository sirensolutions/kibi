import sinon from 'auto-release-sinon';
import Scenario from './scenarios/empty/scenario';
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  class SavedObjectsAPIMock {
    getMiddlewares() {
      return [];
    }
  }

  const helper = new ModelTestHelper(60000, 'index-pattern', 'title', 'idx', {
    saved_objects_api: new SavedObjectsAPIMock()
  });

  class ParametersMiddleware {

    constructor(parameters) {
      this._parameters = parameters;
    }

    async createRequest() {
      return this._parameters;
    }

    async createResponse() {
    }

    async updateRequest() {
      return this._parameters;
    }

    async updateResponse() {
    }

    async deleteRequest() {
      return this._parameters;
    }

    async deleteResponse() {
    }

    async getRequest() {
      return this._parameters;
    }

    async getResponse() {
    }

    async searchRequest() {
      return this._parameters;
    }

    async searchResponse() {
    }

    async patchRequest() {
      return this._parameters;
    }

    async patchResponse() {
    }
  }

  function createSuite(description, request, parametersMatch, middleware) {

    describe(description, () => {

      let callWithRequestSpy;
      let getMiddlewaresStub;

      beforeEach(async () => {
        callWithRequestSpy = sinon.spy(helper.getCluster(), 'callWithRequest');
        if (middleware) {
          getMiddlewaresStub = sinon.stub(helper.server.plugins.saved_objects_api, 'getMiddlewares', () => [
            middleware
          ]);
        }
        await helper.reload(Scenario);
      });

      afterEach(() => {
        callWithRequestSpy.restore();
        if (middleware) {
          getMiddlewaresStub.restore();
        }
      });

      it('should set client parameters when creating an object.', async () => {
        const model = helper.getInstance();
        await model.create('idx1', {title: '1'}, request);

        sinon.assert.callCount(callWithRequestSpy, 3);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'indices.getMapping', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'indices.putMapping', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'create', parametersMatch);
      });

      it('should set client parameters when indexing an object.', async () => {
        const model = helper.getInstance();
        await model.update('idx1', {title: '1'}, request);

        sinon.assert.callCount(callWithRequestSpy, 3);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'indices.getMapping', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'indices.putMapping', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'index', parametersMatch);
      });

      it('should set client parameters when patching an object.', async () => {
        const model = helper.getInstance();
        await model.create('idx1', {title: '1'}, request);
        await model.patch('idx1', {title: '2'}, request);

        sinon.assert.callCount(callWithRequestSpy, 4);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'indices.getMapping', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'indices.putMapping', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'create', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'update', parametersMatch);
      });

      it('should set client parameters when retrieving an object.', async () => {
        const model = helper.getInstance();
        await model.create('idx1', {title: '1'}, request);
        callWithRequestSpy.restore();

        callWithRequestSpy = sinon.spy(helper.getCluster(), 'callWithRequest');
        await model.get('idx1', request);

        sinon.assert.callCount(callWithRequestSpy, 1);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'get', parametersMatch);
      });

      it('should set client parameters when deleting an object.', async () => {
        const model = helper.getInstance();
        await model.create('idx1', {title: '1'}, request);
        callWithRequestSpy.restore();

        callWithRequestSpy = sinon.spy(helper.getCluster(), 'callWithRequest');
        await model.delete('idx1', request);

        sinon.assert.callCount(callWithRequestSpy, 1);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'delete', parametersMatch);
      });

      it('should set client parameters when searching a type.', async () => {
        const model = helper.getInstance();

        callWithRequestSpy.restore();

        for (let i = 0; i < 101; i++) {
          await model.create(`idx-${i}`, {title: `${i}`}, request);
        }

        callWithRequestSpy = sinon.spy(helper.getCluster(), 'callWithRequest');
        const response = await model.search(1, null, request);
        sinon.assert.callCount(callWithRequestSpy, 3);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'search', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'scroll', parametersMatch);
        sinon.assert.calledWith(callWithRequestSpy, {}, 'clearScroll', parametersMatch);
        sinon.assert.match(response.hits.hits.length, 101);
        sinon.assert.match(response.hits.hits[100]._source.title, '100');
      });

    });

  }

  describe('a model', () => {

    describe('with a middleware returning authorization headers', () => {

      const requests = {
        'processing no request': undefined,
        'processing an authenticated request': {
          headers: {
            authorization: 'user'
          }
        }
      };

      const rootMiddleware = new ParametersMiddleware({
        headers: {
          authorization: 'root'
        }
      });

      const parametersMatch = sinon.match.has('headers', {authorization: 'root'});

      for (const key of Object.keys(requests)) {
        createSuite(key, requests[key], parametersMatch, rootMiddleware);
      }

    });

    describe('with no middleware', () => {

      const parametersMatch = sinon.match.has('headers', {authorization: 'user'});
      createSuite('processing an authenticated request', { headers: { authorization: 'user'}}, parametersMatch);

      createSuite('processing a non authenticated request', { headers: { accept: 'application/json' } },
        sinon.match(value => !!!value.headers));

    });

  });

});
