import MappingSetupProvider from 'ui/utils/mapping_setup';
import noDigestPromises from 'test_utils/no_digest_promises';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed

let savedDatasources;

describe('Kibi Services', function () {
  describe('savedDatasources', function () {

    noDigestPromises.activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana', $provide => {
        $provide.constant('kibiDatasourcesSchema', {});
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedDatasources = $injector.get('savedDatasources');
        const mappingSetup = Private(MappingSetupProvider);
        // here we to stub a function from mappingSetup to avoid the call to private method
        // which requires access to elasticsearch
        sinon.stub(mappingSetup, 'isDefined').returns(Promise.resolve(true));
      });
    });

    it('object should not be cached when id undefined or missing', function (done) {
      savedDatasources.get().then(function (firstSavedDatasource) {
        return savedDatasources.get().then(function (secondSavedDatasource) {
          expect(firstSavedDatasource !== secondSavedDatasource).to.equal(true);
          done();
        });
      }).catch(done);
    });

  });
});
