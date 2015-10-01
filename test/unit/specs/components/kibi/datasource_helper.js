define(function (require) {
  var datasourceHelper;
  var fake_saved_datasources = require('fixtures/fake_saved_datasources');
  var $rootScope;


  describe('Kibi Components', function () {
    describe('Datasource Helper', function () {

      beforeEach(function () {
        module('kibana');

        module('kibana', function ($provide) {
          $provide.service('savedDatasources', fake_saved_datasources);
        });

        inject(function ($injector, Private, _$rootScope_) {
          $rootScope = _$rootScope_;
          datasourceHelper = Private(require('components/sindicetech/datasource_helper/datasource_helper'));
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
});
