import sinon from 'sinon';
import expect from 'expect.js';
import Scenario from './scenarios/empty/scenario';
import ModelTestHelper from './helper';
import DatasourceModel from '../../builtin/datasource';
import requirefrom from 'requirefrom';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('saved_objects_api/functional', function () {

  const helper = new ModelTestHelper(60000, 'datasource', 'title', 'ds');

  describe('DatasourceModel', function () {

    const expectedMapping = {
      title: {
        type: 'text'
      },
      datasourceParams: {
        type: 'text'
      },
      datasourceType: {
        type: 'text'
      },
      description: {
        type: 'text'
      },
      kibanaSavedObjectMeta: {
        properties : {
          searchSourceJSON : {
            type : 'text'
          }
        }
      },
      version: {
        type: 'integer'
      }
    };

    beforeEach(wrapAsync(async () => {
      await helper.reload(Scenario);
    }));

    it('should throw a ConflictError on creation conflicts.', wrapAsync(async () => {
      return helper.testCreation();
    }));

    describe('it should call cryptoHelper.encryptDatasourceParams', function () {

      const cryptoHelperMock = {
        encryptDatasourceParams: () => {}
      };
      let getCryptoHelperStub;
      let encryptSpy;

      const datasourceBody = {
        datasourceType: 't',
        datasourceParams: JSON.stringify({
          user: 'u'
        })
      };

      beforeEach(function () {
        encryptSpy = sinon.spy(cryptoHelperMock, 'encryptDatasourceParams');
        getCryptoHelperStub = sinon.stub(helper.server.plugins.kibi_core, 'getCryptoHelper', () => cryptoHelperMock);
      });

      it('when indexing a datasource', wrapAsync(async () => {
        const model = new DatasourceModel(helper.server);
        await model.update('enc', datasourceBody);
        expect(encryptSpy.calledWith(helper.server.config(), datasourceBody)).to.be(true);
      }));

      it('when creating a datasource', wrapAsync(async () => {
        const model = new DatasourceModel(helper.server);
        await model.create('enc', datasourceBody);
        expect(encryptSpy.calledWith(helper.server.config(), datasourceBody)).to.be(true);
      }));

      afterEach(function () {
        encryptSpy.restore();
        getCryptoHelperStub.restore();
      });

    });

    it('should create mappings when creating a datasource if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsCreation(expectedMapping);
    }));

    it('should create mappings when indexing a datasource if they do not exist.', wrapAsync(async () => {
      return helper.testMappingsIndexing(expectedMapping);
    }));

    it('should not create mappings when creating a datasource if they already exist.', wrapAsync(async () => {
      return helper.testSkipMappings();
    }));

  });

});
