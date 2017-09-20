import MappingSetupProvider from 'ui/utils/mapping_setup';
import noDigestPromises from 'test_utils/no_digest_promises';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import sinon from 'sinon';

let savedQueries;

describe('Kibi Services', function () {
  describe('savedQueries', function () {

    noDigestPromises.activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana');

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedQueries = $injector.get('savedQueries');
        const mappingSetup = Private(MappingSetupProvider);
        // here we to stub a function from mappingSetup to avoid the call to private method
        // which requires access to elasticsearch
        sinon.stub(mappingSetup, 'isDefined').returns(Promise.resolve(true));
      });
    });

    it('object should not be cached when id undefined or missing', function (done) {
      savedQueries.get().then(function (firstSavedQuery) {
        return savedQueries.get().then(function (secondSavedQuery) {
          expect(firstSavedQuery !== secondSavedQuery).to.equal(true);
          done();
        });
      }).catch(done);
    });

  });
});
