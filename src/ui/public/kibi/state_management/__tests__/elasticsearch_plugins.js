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

    const fakeComponent = { component: 'some es plugin', version: '1.2.3' };

    it('should use the getElasticsearchPlugins route to retrieve the list of installed plugin names', function (done) {
      $httpBackend.expectGET('/getElasticsearchPlugins').respond([ 'some es plugin' ]);
      $httpBackend.expectGET('/getElasticsearchPlugins/versions').respond([]);
      elasticsearchPlugins.init()
      .then(() => {
        expect(elasticsearchPlugins.get()).to.eql([ 'some es plugin' ]);
        done();
      }).catch(done);

      $httpBackend.flush();
    });


    it('should use the getElasticsearchPlugins/versions route to retrieve the list of plugin names and versions', function (done) {
      $httpBackend.expectGET('/getElasticsearchPlugins').respond([]);
      $httpBackend.expectGET('/getElasticsearchPlugins/versions').respond([fakeComponent]);
      elasticsearchPlugins.init()
      .then(() => {
        expect(elasticsearchPlugins.get({ version: true })).to.eql([fakeComponent]);
        done();
      }).catch(done);

      $httpBackend.flush();
    });
  });
});
