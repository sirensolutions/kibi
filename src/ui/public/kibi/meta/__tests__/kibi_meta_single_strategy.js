import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import pollUntil from 'ui/kibi/directives/__tests__/_poll_until.js';

describe('Kibi meta service - single strategy', function () {

  let kibiMeta;
  let es;
  let config;
  let msearchStub;

  beforeEach(ngMock.module('kibana'));

  // NOTE: important that we stub config before we inject kibiMeta
  // do not try to merge this beforeEach with next one
  beforeEach(ngMock.inject(function (_config_) {
    config = _config_;
    sinon.stub(config, 'get', function (key) {
      if (key === 'siren:countFetchingStrategyDashboards' || key === 'siren:countFetchingStrategyRelationalFilters') {
        return {
          name: 'default',
          batchSize: 2,
          retryOnError: 1,
          parallelRequests: 1
        };
      }
    });
  }));

  beforeEach(ngMock.inject(function (_es_, _kibiMeta_) {
    es = _es_;
    kibiMeta = _kibiMeta_;
    kibiMeta.flushCache();
    msearchStub = sinon.stub(es, 'msearch');
  }));

  afterEach(function () {
    config.get.restore();
    es.msearch.restore();
  });

  describe('getMetaForDashboards', function () {
    it('Should sort and group request by target index', function (done) {
      const expectedMeta1 = {
        hits: {
          total: 11
        }
      };
      const expectedMeta2 = {
        hits: {
          total: 22
        }
      };
      const expectedMeta3 = {
        hits: {
          total: 33
        }
      };
      const expectedMeta4 = {
        hits: {
          total: 44
        }
      };
      msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta3 ] }));
      msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta2, expectedMeta4 ] }));
      const callback1Spy = sinon.spy();
      const callback2Spy = sinon.spy();
      const callback3Spy = sinon.spy();
      const callback4Spy = sinon.spy();

      const query1 = '{"index":["index_A"]}\nquery1';
      const query2 = '{"index":["index_B"]}\nquery2';
      const query3 = '{"index":["index_A"]}\nquery3';
      const query4 = '{"index":["index_B"]}\nquery4';

      const definitions = [
        {
          definition: { id: 'dash1', query: query1 },
          callback: callback1Spy
        },
        {
          definition: { id: 'dash2', query: query2 },
          callback: callback2Spy
        },
        {
          definition: { id: 'dash3', query: query3 },
          callback: callback3Spy
        },
        {
          definition: { id: 'dash4', query: query4 },
          callback: callback4Spy
        }
      ];

      kibiMeta.getMetaForDashboards(definitions);

      pollUntil(
        function () {
          return callback1Spy.called && callback2Spy.called && callback3Spy.called && callback4Spy.called;
        },
        2000, 2,
        function (err) {
          if (err) {
            done(err);
          }
          sinon.assert.calledTwice(msearchStub);
          // here test the body of each msearch
          // if requests are properly sorted and grouped by target index
          // then
          // first call should have queries 1 and 2 for index_A
          // second call should have queries 3 and 4 for index_B
          expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1 + query3, getMeta: 'default__dashboard__dashboard' });
          expect(msearchStub.getCall(1).args[0]).to.eql({ body: query2 + query4, getMeta: 'default__dashboard__dashboard' });

          sinon.assert.calledOnce(callback1Spy);
          sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
          sinon.assert.calledOnce(callback2Spy);
          sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
          sinon.assert.calledOnce(callback3Spy);
          sinon.assert.calledWith(callback3Spy, null, expectedMeta3);
          sinon.assert.calledOnce(callback4Spy);
          sinon.assert.calledWith(callback4Spy, null, expectedMeta4);

          sinon.assert.callOrder(callback1Spy, callback3Spy, callback2Spy, callback4Spy);
          done();
        }
      );
    });
  });

});
