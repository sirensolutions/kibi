import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('State Management', function () {
  describe('elasticsearchPlugins service', function () {
    let elasticsearchPlugins;
    let $httpBackend;

    beforeEach(() => {
      ngMock.module('kibana');

      ngMock.inject(function (_elasticsearchPlugins_, _$httpBackend_) {
        elasticsearchPlugins = _elasticsearchPlugins_;
        $httpBackend = _$httpBackend_;
      });
    });

    afterEach(() => $httpBackend.verifyNoOutstandingExpectation());
    afterEach(() => $httpBackend.verifyNoOutstandingRequest());

    it('should use the getElasticsearchPlugins route to retrive the list of installed plugins', function (done) {
      $httpBackend.expectGET('/getElasticsearchPlugins').respond([ 'some es plugin' ]);

      elasticsearchPlugins.init()
      .then(() => {
        expect(elasticsearchPlugins.get()).to.eql([ 'some es plugin' ]);
        done();
      }).catch(done);

      $httpBackend.flush();
    });
  });
});
