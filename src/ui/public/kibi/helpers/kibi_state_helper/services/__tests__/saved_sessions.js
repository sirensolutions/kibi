var expect = require('expect.js');
var ngMock = require('ngMock');
var Promise = require('bluebird');
var sinon = require('auto-release-sinon');

var savedSessions;

describe('Kibi Services', function () {
  describe('savedSessions', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana');

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedSessions = $injector.get('savedSessions');
        var mappingSetup = Private(require('ui/utils/mapping_setup'));
        // here we to stub a function from mappingSetup to avoid the call to private method
        // which requires access to elasticsearch
        sinon.stub(mappingSetup, 'isDefined').returns(Promise.resolve(true));
      });
    });

    it('object should not be cached when id undefined or missing', function (done) {
      savedSessions.get().then(function (firstSavedSession) {
        return savedSessions.get().then(function (secondSavedSession) {
          expect(firstSavedSession !== secondSavedSession).to.equal(true);
          done();
        });
      }).catch(done);
    });

  });
});
