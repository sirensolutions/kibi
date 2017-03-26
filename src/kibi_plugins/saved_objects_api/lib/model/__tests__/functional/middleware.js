import requirefrom from 'requirefrom';
import sinon from 'sinon';
import expect from 'expect.js';
import Scenario from './scenarios/empty/scenario';
const wrapAsync = requirefrom('src/test_utils')('wrap_async');
const serverConfig = requirefrom('test')('server_config');
import ModelTestHelper from './helper';

describe('saved_objects_api/functional', function () {

  class SavedObjectsAPIMock {
    getMiddlewares() {}
  }

  const helper = new ModelTestHelper(60000, 'index-pattern', 'title', 'idx', {saved_objects_api: new SavedObjectsAPIMock()});

  class Middleware {
    async createRequest() {}

    async createResponse() {}

    async updateRequest() {}

    async updateResponse() {}

    async deleteRequest() {}

    async deleteResponse() {}

    async getRequest() {}

    async getResponse() {}

    async searchRequest() {}

    async searchResponse() {}

    async patchRequest() {}

    async patchResponse() {}
  }

  const middleware = new Middleware();

  describe('middleware', function () {

    let getMiddlewaresStub;
    let middlewareMock;

    beforeEach(wrapAsync(async () => {
      middlewareMock = sinon.mock(middleware);
      getMiddlewaresStub = sinon.stub(helper.server.plugins.saved_objects_api, 'getMiddlewares', () => [ middleware ]);
      await helper.reload(Scenario);
    }));

    afterEach(function () {
      middlewareMock.restore();
      getMiddlewaresStub.restore();
    });

    it('should call registered middlewares when creating an object.', wrapAsync(async () => {
      middlewareMock
      .expects('createRequest')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', {title: '1'}, undefined);
      middlewareMock
      .expects('updateRequest')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', {title: '1'}, undefined);
      middlewareMock
      .expects('createResponse')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', {title: '1'}, undefined, sinon.match.has('_id', 'idx1'));

      await helper.testCreation();
      expect(getMiddlewaresStub.callCount).to.be(3);
      middlewareMock.verify();
    }));

    it('should call registered middlewares when updating an object.', wrapAsync(async () => {
      middlewareMock
      .expects('createRequest')
      .withExactArgs(helper.getInstance(), 'idx1', {title: '1'}, undefined);
      middlewareMock
      .expects('updateRequest')
      .withExactArgs(helper.getInstance(), 'idx1', {title: '2'}, undefined);
      middlewareMock
      .expects('createRequest')
      .withExactArgs(helper.getInstance(), 'idx2', {title: '1'}, undefined);

      middlewareMock
      .expects('createResponse')
      .withExactArgs(helper.getInstance(), 'idx1', {title: '1'}, undefined, sinon.match.has('_id', 'idx1'));
      middlewareMock
      .expects('updateResponse')
      .withExactArgs(helper.getInstance(), 'idx1', {title: '2'}, undefined, sinon.match.has('_id', 'idx1'));
      middlewareMock
      .expects('createResponse')
      .withExactArgs(helper.getInstance(), 'idx2', {title: '1'}, undefined, sinon.match.has('_id', 'idx2'));

      await helper.testIndexing();
      expect(getMiddlewaresStub.callCount).to.be(6);
      middlewareMock.verify();
    }));

    it('should call registered middlewares when patching an object.', wrapAsync(async () => {
      const model = helper.getInstance();
      await model.create('idx1', {title: '1'});

      middlewareMock
      .expects('patchRequest')
      .withExactArgs(helper.getInstance(), 'idx1', {title: '2'}, undefined);
      middlewareMock
      .expects('patchResponse')
      .withExactArgs(helper.getInstance(),
        'idx1', {title: '2'}, undefined,
        sinon.match.has('_version', 2)
      );

      await model.patch('idx1', {title: '2'});
      expect(getMiddlewaresStub.callCount).to.be(4);
      middlewareMock.verify();
    }));

    it('should call registered middlewares when retrieving an object.', wrapAsync(async () => {
      const model = helper.getInstance();
      await model.create('idx1', {});

      middlewareMock
      .expects('getRequest')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', undefined);
      middlewareMock
      .expects('getResponse')
      .withExactArgs(helper.getInstance(), 'idx1', undefined, sinon.match.has('_id', 'idx1'));

      await model.get('idx1');
      expect(getMiddlewaresStub.callCount).to.be(4);
      middlewareMock.verify();
    }));

    it('should call registered middlewares when searching objects.', wrapAsync(async () => {
      const model = helper.getInstance();
      await model.create('idx1', {});
      await model.create('idx2', {});

      middlewareMock
      .expects('searchRequest')
      .once()
      .withExactArgs(helper.getInstance(), 10, 'q', undefined);
      middlewareMock
      .expects('searchResponse')
      .withExactArgs(helper.getInstance(), 10, 'q', undefined, { hits: { hits: [], total: 0 }});

      await model.search(10, 'q');
      expect(getMiddlewaresStub.callCount).to.be(6);
      middlewareMock.verify();
    }));

    it('should call registered middlewares when deleting an object.', wrapAsync(async () => {
      const model = helper.getInstance();
      await model.create('idx1', {});

      middlewareMock
      .expects('deleteRequest')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', undefined);
      middlewareMock
      .expects('deleteResponse')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', undefined);

      await model.delete('idx1');
      expect(getMiddlewaresStub.callCount).to.be(4);
      middlewareMock.verify();
    }));

    it('should call registered middlewares when deleting an object.', wrapAsync(async () => {
      const model = helper.getInstance();
      await model.create('idx1', {});

      middlewareMock
      .expects('deleteRequest')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', undefined);
      middlewareMock
      .expects('deleteResponse')
      .once()
      .withExactArgs(helper.getInstance(), 'idx1', undefined);

      await model.delete('idx1');
      expect(getMiddlewaresStub.callCount).to.be(4);
      middlewareMock.verify();
    }));

  });

});
