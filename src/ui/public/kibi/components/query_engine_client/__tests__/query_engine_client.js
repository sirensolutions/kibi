var ngMock = require('ngMock');
var $httpBackend;
var queryEngineClient;

describe('Kibi Components', function () {
  describe('Query engine client', function () {
    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.inject(function ($injector) {
        $httpBackend = $injector.get('$httpBackend');
        queryEngineClient = $injector.get('queryEngineClient');
      });
    });

    it('gets the queries html from the server synchronously', function () {
      var queryDef = encodeURIComponent('[{}]');
      var options = encodeURIComponent('{"selectedDocuments":[]}');
      $httpBackend.expectGET('/getQueriesHtml?options=' + options + '&queryDefs=' + queryDef).respond();
      queryEngineClient.getQueriesHtmlFromServer({}, {}, true);
      $httpBackend.flush();
    });

    it('gets the queries html from the server asynchronously', function () {
      var queryDef = encodeURIComponent('[{}]');
      var options = encodeURIComponent('{}');
      $httpBackend.expectGET('/getQueriesHtml?options=' + options + '&queryDefs=' + queryDef).respond();
      queryEngineClient.getQueriesHtmlFromServer({}, {}, false);
    });

    it('gets the queries data from the server synchronously', function () {
      var queryDef = encodeURIComponent('[{}]');
      var options = encodeURIComponent('{"selectedDocuments":[]}');
      $httpBackend.expectGET('/getQueriesData?options=' + options + '&queryDefs=' + queryDef).respond();
      queryEngineClient.getQueriesDataFromServer({}, {}, true);
      $httpBackend.flush();
    });

    it('gets the queries data from the server asynchronously', function () {
      var queryDef = encodeURIComponent('[{}]');
      var options = encodeURIComponent('{}');
      $httpBackend.expectGET('/getQueriesData?options=' + options + '&queryDefs=' + queryDef).respond();
      queryEngineClient.getQueriesDataFromServer({}, {}, false);
    });
  });
});
