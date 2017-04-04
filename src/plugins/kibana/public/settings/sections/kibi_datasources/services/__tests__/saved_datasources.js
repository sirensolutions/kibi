var expect = require('expect.js');
var ngMock = require('ngMock');
var Promise = require('bluebird');
var sinon = require('auto-release-sinon');

var savedDatasources;

describe('Kibi Services', function () {
  describe('savedDatasources', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        $provide.constant('kibiDatasourcesSchema', {});
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        savedDatasources = $injector.get('savedDatasources');
        var mappingSetup = Private(require('ui/utils/mapping_setup'));
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
