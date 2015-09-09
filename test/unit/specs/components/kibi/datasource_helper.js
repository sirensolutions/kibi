define(function (require) {
  var datasourceHelper;

  describe('Kibi Components', function () {
    describe('Datasource Helper', function () {

      beforeEach(function () {
        module('kibana');

        module('kibana', function ($provide) {
          $provide.constant('configFile', {
            datasources: [
              {
                id: 'grishka',
                type: 'dog'
              }
            ]
          });
        });

        inject(function ($injector, Private) {
          datasourceHelper = Private(require('components/sindicetech/datasource_helper/datasource_helper'));
        });
      });

      it('getDatasourceType', function () {
        expect(datasourceHelper.getDatasourceType('grishka')).to.be('dog');
        expect(datasourceHelper.getDatasourceType('pluto')).to.be(undefined);
      });
    });
  });
});
