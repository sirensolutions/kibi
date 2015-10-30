define(function (require) {
  var $httpBackend;
  var queryEngineClient;

  describe('Kibi Components', function () {
    describe('Query engine client', function () {
      beforeEach( function () {
        module('kibana');

        inject(function ($injector) {
          $httpBackend = $injector.get('$httpBackend');
          queryEngineClient = $injector.get('queryEngineClient');
        });
      });

      it('gets the queries html from the server synchronously', function () {
        var queryDef = encodeURIComponent('[{}]');
        var options = encodeURIComponent('{}');
        $httpBackend.expectGET('datasource/getQueriesHtml?options=' + options + '&queryDefs=' + queryDef).respond();
        queryEngineClient.getQueriesHtmlFromServer({}, {}, true);
        $httpBackend.flush();
      });

      it('gets the queries html from the server asynchronously', function () {
        var queryDef = encodeURIComponent('[{}]');
        var options = encodeURIComponent('{}');
        $httpBackend.expectGET('datasource/getQueriesHtml?options=' + options + '&queryDefs=' + queryDef).respond();
        queryEngineClient.getQueriesHtmlFromServer({}, {}, false);
      });

      it('gets the queries data from the server synchronously', function () {
        var queryDef = encodeURIComponent('[{}]');
        var options = encodeURIComponent('{}');
        $httpBackend.expectGET('datasource/getQueriesData?options=' + options + '&queryDefs=' + queryDef).respond();
        queryEngineClient.getQueriesDataFromServer({}, {}, true);
        $httpBackend.flush();
      });

      it('gets the queries data from the server asynchronously', function () {
        var queryDef = encodeURIComponent('[{}]');
        var options = encodeURIComponent('{}');
        $httpBackend.expectGET('datasource/getQueriesData?options=' + options + '&queryDefs=' + queryDef).respond();
        queryEngineClient.getQueriesDataFromServer({}, {}, false);
      });
    });
  });
});
