import DatasourceHelperProvider from 'ui/kibi/helpers/datasource_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';

const fakeSavedDatasources = [
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

let datasourceHelper;
let $rootScope;

describe('Kibi Components', function () {
  describe('Datasource Helper', function () {

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        $provide.service('savedDatasources', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedDatasources', fakeSavedDatasources);
        });
      });

      ngMock.inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        datasourceHelper = Private(DatasourceHelperProvider);
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

