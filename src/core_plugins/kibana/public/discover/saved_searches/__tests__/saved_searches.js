const expect = require('expect.js');
const ngMock = require('ngMock');
const Promise = require('bluebird');
const sinon = require('auto-release-sinon');

let savedSearches;

describe('Kibi Services', function () {
  describe('savedSearches', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana');

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedSearches = $injector.get('savedSearches');
        const mappingSetup = Private(require('ui/utils/mapping_setup'));
        // here we to stub a function from mappingSetup to avoid the call to private method
        // which requires access to elasticsearch
        sinon.stub(mappingSetup, 'isDefined').returns(Promise.resolve(true));
      });
    });

    it('object should not be cached when id undefined or missing', function (done) {
      savedSearches.get().then(function (firstSavedSearch) {
        return savedSearches.get().then(function (secondSavedSearch) {
          expect(firstSavedSearch !== secondSavedSearch).to.equal(true);
          done();
        });
      }).catch(done);
    });

  });
});
