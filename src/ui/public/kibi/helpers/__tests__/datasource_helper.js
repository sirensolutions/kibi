var expect = require('expect.js');
var ngMock = require('ngMock');
var datasourceHelper;
var fakeSavedDatasources = require('../../../../../fixtures/kibi/fake_saved_datasources');
var $rootScope;


describe('Kibi Components', function () {
  describe('Datasource Helper', function () {

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        $provide.service('savedDatasources', fakeSavedDatasources);
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        datasourceHelper = Private(require('ui/kibi/helpers/datasource_helper'));
      });
    });

    it('getDatasourceType', function (done) {
      datasourceHelper.getDatasourceType('ds1').then(function (datasourceType) {
        expect(datasourceType).to.equal('sparql_http');
        done();
      });

      $rootScope.$apply();
    });

    it('getDatasourceType on non existing datasource', function (done) {
      datasourceHelper.getDatasourceType('theisnosuchdatasource')
      .catch(function (err) {
        expect(err.message).to.equal('Could not find datasource [theisnosuchdatasource]');
        done();
      });

      $rootScope.$apply();
    });


  });
});

