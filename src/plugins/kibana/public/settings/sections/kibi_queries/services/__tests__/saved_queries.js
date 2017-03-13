var expect = require('expect.js');
var ngMock = require('ngMock');
var Promise = require('bluebird');
var sinon = require('auto-release-sinon');

var savedQueries;

describe('Kibi Services', function () {
  describe('savedQueries', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedQueries = $injector.get('savedQueries');
        var mappingSetup = Private(require('ui/utils/mapping_setup'));
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
