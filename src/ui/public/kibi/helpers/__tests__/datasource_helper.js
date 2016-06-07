var expect = require('expect.js');
var ngMock = require('ngMock');
var datasourceHelper;

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var fakeSavedDatasources = [
  {
    id: 'ds1',
    title: 'ds1 datasource',
    datasourceType: 'sparql_http'
  },
  {
    id: 'ds2',
    title: 'ds2 datasource',
    datasourceType: 'mysql'
  },
  {
    id: 'ds3',
    title: 'ds3 datasource',
    datasourceType: 'rest'
  }
];
var $rootScope;


describe('Kibi Components', function () {
  describe('Datasource Helper', function () {

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        $provide.service('savedDatasources', (Promise) => mockSavedObjects(Promise)('savedDatasources', fakeSavedDatasources));
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
      }).catch(done);

      $rootScope.$apply();
    });

    it('getDatasourceType on non existing datasource', function (done) {
      datasourceHelper.getDatasourceType('theisnosuchdatasource')
      .then(done)
      .catch(function (err) {
        expect(err.message).to.equal('Could not find object with id: theisnosuchdatasource');
        done();
      });

      $rootScope.$apply();
    });


  });
});

