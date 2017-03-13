var expect = require('expect.js');
var ngMock = require('ngMock');
var Promise = require('bluebird');
var sinon = require('auto-release-sinon');

var savedTemplates;

describe('Kibi Services', function () {
  describe('savedTemplates', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        // kibi: provide elasticsearchPlugins constant
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedTemplates = $injector.get('savedTemplates');
        var mappingSetup = Private(require('ui/utils/mapping_setup'));
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
