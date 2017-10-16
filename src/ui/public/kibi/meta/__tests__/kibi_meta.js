import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import pollUntil from 'ui//kibi/directives/__tests__/_poll_until.js';

describe('Kibi meta service', function () {

  let kibiMeta;
  let es;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_kibiMeta_, _es_) {
    kibiMeta = _kibiMeta_;
    kibiMeta.flushCache();
    es = _es_;
  }));

  describe('getMetaForDashboards', function () {

    describe('definitions not OK', function () {

      it('Should throw when no definition object', function () {
        const definitions = [{
        }];
        try {
          kibiMeta.getMetaForDashboards(definitions);
          expect().fail('Should throw an error');
        } catch(err) {
          expect(err.message).to.equal(
            'Wrong dashboards definition: ' +
            JSON.stringify({}) +
            '. Defintion requires a definition object like { id: ID, query: query}'
          );
        }
      });


      it('Should throw when definition does not have a query', function () {
        const definitions = [{
          definition: { id: 'dash1' },
          callback: function () {}
        }];
        try {
          kibiMeta.getMetaForDashboards(definitions);
          expect().fail('Should throw an error');
        } catch(err) {
          expect(err.message).to.equal(
            'Wrong dashboards definition object: ' +
            JSON.stringify({ id: 'dash1' }) +
            '. Defintion object requires two mandatory properties: id and query'
          );
        }
      });

      it('Should throw when definition does not have an id', function () {
        const definitions = [{
          definition: { query: 'query1' },
          callback: function () {}
        }];
        try {
          kibiMeta.getMetaForDashboards(definitions);
          expect().fail('Should throw an error');
        } catch(err) {
          expect(err.message).to.equal(
            'Wrong dashboards definition object: ' +
            JSON.stringify({ query: 'query1' }) +
            '. Defintion object requires two mandatory properties: id and query'
          );
        }
      });
    });

    describe('all responces OK', function () {

      describe('single msearch call', function () {

        it('single definition - response OK', function (done) {
          const expectedMeta1 = {
            hits: {
              total: 11
            }
          };
          const msearchStub = sinon.stub(es, 'msearch');
          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
          const callback1Spy = sinon.spy();
          const definitions = [{
            definition: { id: 'dash1', query: 'query1' },
            callback: callback1Spy
          }];

          kibiMeta.getMetaForDashboards(definitions);

          pollUntil(
            function () {
              return callback1Spy.called;
            },
            2000, 2,
            function (err) {
              if (err) {
                done(err);
              }
              sinon.assert.calledOnce(msearchStub);
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, undefined, expectedMeta1);
              done();
            }
          );
        });

        it('multiple definition - responses OK', function (done) {
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
          const msearchStub = sinon.stub(es, 'msearch');
          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const definitions = [
            {
              definition: { id: 'dash1', query: 'query1' },
              callback: callback1Spy
            },
            {
              definition: { id: 'dash2', query: 'query2' },
              callback: callback2Spy
            }
          ];

          kibiMeta.getMetaForDashboards(definitions);

          pollUntil(
            function () {
              return callback1Spy.called && callback2Spy.called;
            },
            2000, 2,
            function (err) {
              if (err) {
                done(err);
              }
              sinon.assert.calledOnce(msearchStub);
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, undefined, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, undefined, expectedMeta2);
              sinon.assert.callOrder(callback1Spy, callback2Spy);
              done();
            }
          );
        });
      });

      describe('multiple msearch calls', function () {

        it('default policy - 3 definitions to trigger two msearch calls, response OK', function (done) {
          const expectedMeta1 = { hits: { total: 11 } };
          const expectedMeta2 = { hits: { total: 22 } };
          const expectedMeta3 = { hits: { total: 33 } };

          const msearchStub = sinon.stub(es, 'msearch');
          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta3 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const definitions = [
            {
              definition: { id: 'dash1', query: 'query1' },
              callback: callback1Spy
            },
            {
              definition: { id: 'dash2', query: 'query2' },
              callback: callback2Spy
            },
            {
              definition: { id: 'dash3', query: 'query3' },
              callback: callback3Spy
            }
          ];

          kibiMeta.getMetaForDashboards(definitions);

          pollUntil(
            function () {
              return callback1Spy.called && callback2Spy.called && callback3Spy.called;
            },
            2000, 2,
            function (err) {
              if (err) {
                done(err);
              }
              sinon.assert.calledTwice(msearchStub);
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: 'query1query2', getMeta: 'dashboards' });
              expect(msearchStub.getCall(1).args[0]).to.eql({ body: 'query3', getMeta: 'dashboards' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, undefined, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, undefined, expectedMeta2);
              sinon.assert.calledOnce(callback3Spy);
              sinon.assert.calledWith(callback3Spy, undefined, expectedMeta3);
              // here we are also veryfying that second msearch start only after first to callback are executed
              sinon.assert.callOrder(msearchStub, callback1Spy, callback2Spy, msearchStub, callback3Spy);
              done();
            }
          );
        });

        it('default policy - 3 definitions to trigger two msearch calls, first one delayed, response OK', function (done) {
          const expectedMeta1 = { hits: { total: 11 } };
          const expectedMeta2 = { hits: { total: 22 } };
          const expectedMeta3 = { hits: { total: 33 } };

          const msearchStub = sinon.stub(es, 'msearch');


          msearchStub.onCall(0).returns(new Promise (function (fulfill, reject) {
            setTimeout(function () {
              fulfill({ responses: [ expectedMeta1, expectedMeta2 ] });
            }, 500);
          }));
          msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta3 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const definitions = [
            {
              definition: { id: 'dash1', query: 'query1' },
              callback: callback1Spy
            },
            {
              definition: { id: 'dash2', query: 'query2' },
              callback: callback2Spy
            },
            {
              definition: { id: 'dash3', query: 'query3' },
              callback: callback3Spy
            }
          ];

          kibiMeta.getMetaForDashboards(definitions);

          pollUntil(
            function () {
              return callback1Spy.called && callback2Spy.called && callback3Spy.called;
            },
            2000, 2,
            function (err) {
              if (err) {
                done(err);
              }
              sinon.assert.calledTwice(msearchStub);
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: 'query1query2', getMeta: 'dashboards' });
              expect(msearchStub.getCall(1).args[0]).to.eql({ body: 'query3', getMeta: 'dashboards' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, undefined, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, undefined, expectedMeta2);
              sinon.assert.calledOnce(callback3Spy);
              sinon.assert.calledWith(callback3Spy, undefined, expectedMeta3);
              sinon.assert.callOrder(msearchStub, callback1Spy, callback2Spy, msearchStub, callback3Spy);
              done();
            }
          );
        });
      });

      describe('test cache', function () {
        it('default policy - 3 definitions to trigger two msearch calls, response OK, third def identical to first one', function (done) {
          const expectedMeta1 = { hits: { total: 11 } };
          const expectedMeta2 = { hits: { total: 22 } };
          const expectedMeta3 = { hits: { total: 11 } };

          const msearchStub = sinon.stub(es, 'msearch');
          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const definitions = [
            {
              definition: { id: 'dash1', query: 'query1' },
              callback: callback1Spy
            },
            {
              definition: { id: 'dash2', query: 'query2' },
              callback: callback2Spy
            },
            {
              definition: { id: 'dash1', query: 'query1' },
              callback: callback3Spy
            }
          ];

          kibiMeta.getMetaForDashboards(definitions);

          pollUntil(
            function () {
              return callback1Spy.called && callback2Spy.called && callback3Spy.called;
            },
            2000, 2,
            function (err) {
              if (err) {
                done(err);
              }
              sinon.assert.calledOnce(msearchStub);
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: 'query1query2', getMeta: 'dashboards' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, undefined, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, undefined, expectedMeta2);
              sinon.assert.calledOnce(callback3Spy);
              sinon.assert.calledWith(callback3Spy, undefined, expectedMeta1);
              sinon.assert.callOrder(callback1Spy, callback2Spy, callback3Spy);
              done();
            }
          );
        });
      });
    });

    describe('test a retry when response failed', function () {
      it('default strategy - 1 definitions, 1 retry', function (done) {
        const expectedError1 = { error: 'Sorry error' };
        const expectedMeta1 = { hits: { total: 11 } };

        const msearchStub = sinon.stub(es, 'msearch');
        msearchStub.onCall(0).returns(Promise.reject({ responses: [ expectedError1 ] }));
        msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
        const callback1Spy = sinon.spy();
        const definitions = [
          {
            definition: { id: 'dash1', query: 'query1' },
            callback: callback1Spy
          }
        ];

        kibiMeta.getMetaForDashboards(definitions);

        pollUntil(
          function () {
            return callback1Spy.called;
          },
          2000, 2,
          function (err) {
            if (err) {
              done(err);
            }
            sinon.assert.calledTwice(msearchStub);
            expect(msearchStub.getCall(0).args[0]).to.eql({ body: 'query1', getMeta: 'dashboards' });
            expect(msearchStub.getCall(1).args[0]).to.eql({ body: 'query1', getMeta: 'dashboards' });
            sinon.assert.calledOnce(callback1Spy);
            sinon.assert.calledWith(callback1Spy, undefined, expectedMeta1);
            done();
          }
        );
      });

      it('default strategy - 1 definitions, should failed after 1 unsuccessful retry', function (done) {
        const expectedError1 = { error: 'Sorry error' };
        const msearchStub = sinon.stub(es, 'msearch');
        msearchStub.onCall(0).returns(Promise.reject({ responses: [ expectedError1 ] }));
        msearchStub.onCall(1).returns(Promise.reject({ responses: [ expectedError1 ] }));
        const callback1Spy = sinon.spy();
        const definitions = [
          {
            definition: { id: 'dash1', query: 'query1' },
            callback: callback1Spy
          }
        ];

        kibiMeta.getMetaForDashboards(definitions);

        pollUntil(
          function () {
            return callback1Spy.called;
          },
          2000, 2,
          function (err) {
            if (err) {
              done(err);
            }
            sinon.assert.calledTwice(msearchStub);
            expect(msearchStub.getCall(0).args[0]).to.eql({ body: 'query1', getMeta: 'dashboards' });
            expect(msearchStub.getCall(1).args[0]).to.eql({ body: 'query1', getMeta: 'dashboards' });
            sinon.assert.calledOnce(callback1Spy);
            sinon.assert.calledWith(callback1Spy, new Error(
              'Could not fetch meta for ' +
              JSON.stringify({ definition: { query: 'query1' }, retried: 2 }) +
              ' after retrying 1 times')
            );
            done();
          }
        );
      });
    });

    describe('single msearch fired twice, responces are coming out of order', function () {

      beforeEach(function () {
        kibiMeta.updateStrategy('dashboards', 'parallelRequests', 2);
      });

      afterEach(function () {
        kibiMeta.updateStrategy('dashboards', 'parallelRequests', 1);
      });

      // this test make sense only when strategy.parallelRequests = 2
      it('earlier callback should be cancelled if later one was already executed for particular dashboard', function (done) {

        const expectedMetaA = {
          hits: {
            total: 111
          }
        };
        const expectedMetaB = { // this one is the real expected one
          hits: {
            total: 11
          }
        };

        const msearchStub = sinon.stub(es, 'msearch');

        // first call will arrive late
        msearchStub.onCall(0).returns(new Promise (function (fulfill, reject) {
          setTimeout(function () {
            fulfill({ responses: [ expectedMetaA ] });
          }, 1000);
        }));
        msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMetaB ] }));

        const callbackSpy = sinon.spy();

        const definitionsA = [{
          definition: { id: 'dash1', query: 'queryA' },
          callback: callbackSpy
        }];

        const definitionsB = [{
          definition: { id: 'dash1', query: 'queryB' },
          callback: callbackSpy
        }];

        kibiMeta.getMetaForDashboards(definitionsA);
        kibiMeta.getMetaForDashboards(definitionsB);

        pollUntil(
          function () {
            return callbackSpy.called;
          },
          2000, 2,
          function (err) {
            if (err) {
              done(err);
            }

            // here before the check wait wait twice as much as the delay to be sure
            // in case a second callback was called twice or with a wrong data from the first call we would like to know
            setTimeout(function () {
              sinon.assert.calledTwice(msearchStub);
              sinon.assert.calledOnce(callbackSpy);
              sinon.assert.calledWith(callbackSpy, undefined, expectedMetaB);
              sinon.assert.callOrder(msearchStub, msearchStub, callbackSpy);
              done();
            }, 2000);
          }
        );
      });
    });
  });
});
