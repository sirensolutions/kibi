import MappingSetupProvider from 'ui/utils/mapping_setup';
import noDigestPromises from 'test_utils/no_digest_promises';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import sinon from 'auto-release-sinon';

let savedTemplates;

describe('Kibi Services', function () {
  describe('savedTemplates', function () {

    noDigestPromises.activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        // kibi: provide elasticsearchPlugins constant
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedTemplates = $injector.get('savedTemplates');
        const mappingSetup = Private(MappingSetupProvider);
        // here we to stub a function from mappingSetup to avoid the call to private method
        // which requires access to elasticsearch
        sinon.stub(mappingSetup, 'isDefined').returns(Promise.resolve(true));
      });
    });

    it('object should not be cached when id undefined or missing', function (done) {
      savedTemplates.get().then(function (firstSavedTemplate) {
        return savedTemplates.get().then(function (secondSavedTemplate) {
          expect(firstSavedTemplate !== secondSavedTemplate).to.equal(true);
          done();
        });
      }).catch(done);
    });

  });
});
