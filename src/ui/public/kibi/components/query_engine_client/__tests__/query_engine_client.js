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

    afterEach(function () {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('gets the queries html from the server', function () {
      $httpBackend.expectGET(/\/getQueriesHtml?.*/).respond();
      queryEngineClient.getQueriesHtmlFromServer({}, {});
      $httpBackend.flush();
    });

    it('gets the queries data from the server', function () {
      $httpBackend.expectGET(/\/getQueriesData?.*/).respond();
      queryEngineClient.getQueriesDataFromServer({}, {});
      $httpBackend.flush();
    });
  });
});
