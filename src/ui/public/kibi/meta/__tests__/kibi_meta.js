import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import pollUntil from 'ui/kibi/directives/__tests__/_poll_until.js';

describe('Kibi meta service', function () {

  let kibiMeta;
  let es;
  let config;
  let msearchStub;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));

  // NOTE: important that we stub config before we inject kibiMeta
  // do not try to merge this beforeEach with next one
  beforeEach(ngMock.inject(function (_config_, _$rootScope_) {
    $rootScope = _$rootScope_;
    config = _config_;
    sinon.stub(config, 'get', function (key) {
      if (key === 'siren:countFetchingStrategyDashboards') {
        return {
          name: 'dashboards',
          batchSize: 2,
          retryOnError: 1,
          parallelRequests: 1
        };
      }
      if (key === 'siren:countFetchingStrategyRelationalFilters') {
        return {
          name: 'buttons',
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

  describe('getMetaForRelationalButtons', function () {
    describe('single msearch call', function () {
      // NOTE: there is only 1 test for this method as the both methods
      // are just aliases for a private common method
      // all othert test are done on getMetaForDashboards one
      it('single definition - response OK', function (done) {
        const expectedMeta1 = {
          hits: {
            total: 11
          }
        };
        msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
        const callback1Spy = sinon.spy();

        const query1 = '{"index":["index_A"]}\nquery1';
        const definitions = [{
          definition: { id: 'button1', query: query1 },
          callback: callback1Spy
        }];

        kibiMeta.getMetaForRelationalButtons(definitions);

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
            expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1, getMeta: 'buttons__button' });
            sinon.assert.calledOnce(callback1Spy);
            sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
            done();
          }
        );
      });
    });
  });

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
            '. Definition requires a definition object like { id: ID, query: query}'
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
            '. Definition object requires two mandatory properties: id and query'
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
            '. Definition object requires two mandatory properties: id and query'
          );
        }
      });
    });

    describe('all responses OK', function () {

      describe('single msearch call', function () {

        it('no definitions - no msearch call', function (done) {

          const definitions = [];
          kibiMeta.getMetaForDashboards(definitions);

          // wait 2 sec then check that there was no msearch call
          setTimeout(function () {
            sinon.assert.notCalled(msearchStub);
            done();
          }, 2000);
        });

        it('single definition - response OK', function (done) {
          const expectedMeta1 = {
            hits: {
              total: 11
            }
          };
          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
          const callback1Spy = sinon.spy();

          const query1 = '{"index":["index_A"]}\nquery1';
          const definitions = [{
            definition: { id: 'dash1', query: query1 },
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
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
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
          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const query1 = '{"index":["index_A"]}\nquery1';
          const query2 = '{"index":["index_A"]}\nquery2';
          const definitions = [
            {
              definition: { id: 'dash1', query: query1 },
              callback: callback1Spy
            },
            {
              definition: { id: 'dash2', query: query2 },
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
              sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
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

          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta3 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const query1 = '{"index":["index_A"]}\nquery1';
          const query2 = '{"index":["index_A"]}\nquery2';
          const query3 = '{"index":["index_A"]}\nquery3';
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
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1 + query2, getMeta: 'dashboards__dashboard__dashboard' });
              expect(msearchStub.getCall(1).args[0]).to.eql({ body: query3, getMeta: 'dashboards__dashboard' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
              sinon.assert.calledOnce(callback3Spy);
              sinon.assert.calledWith(callback3Spy, null, expectedMeta3);
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

          msearchStub.onCall(0).returns(new Promise (function (fulfill, reject) {
            setTimeout(function () {
              fulfill({ responses: [ expectedMeta1, expectedMeta2 ] });
            }, 500);
          }));
          msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta3 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const query1 = '{"index":["index_A"]}\nquery1';
          const query2 = '{"index":["index_A"]}\nquery2';
          const query3 = '{"index":["index_A"]}\nquery3';
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
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1 + query2, getMeta: 'dashboards__dashboard__dashboard' });
              expect(msearchStub.getCall(1).args[0]).to.eql({ body: query3, getMeta: 'dashboards__dashboard' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
              sinon.assert.calledOnce(callback3Spy);
              sinon.assert.calledWith(callback3Spy, null, expectedMeta3);
              sinon.assert.callOrder(msearchStub, callback1Spy, callback2Spy, msearchStub, callback3Spy);
              done();
            }
          );
        });
      });

      describe('Flush queues', function () {

        it('should flush only button queue', function () {
          // manually populate queues
          kibiMeta.queues = {
            dashboard: [
              {
                definition: { id: 'dash1', query: 'query1' },
                callback: function () {}
              }
            ],
            button: [
              {
                definition: { id: 'button1', query: 'query1', _debug_type: 'button' },
                callback: function () {},

              }
            ]
          };

          kibiMeta.flushRelationalButtonsFromQueue();

          expect(kibiMeta.queues.dashboard.length).to.equal(1);
          expect(kibiMeta.queues.button.length).to.equal(0);
        });


        it('should flush queues when changing the route from dashboard to another app', function () {
          // manually populate queues
          kibiMeta.queues = {
            dashboard: [
              {
                definition: { id: 'dash1', query: 'query1' },
                callback: function () {}
              }
            ],
            button: [
              {
                definition: { id: 'button1', query: 'query1' },
                callback: function () {}
              }
            ]
          };
          const current = {
            $$route: {
              originalPath: '/dashboard/:id'
            }
          };
          const next = {
            $$route: {
              originalPath: '/discover'
            }
          };

          $rootScope.$emit('$routeChangeStart', next, current);

          expect(kibiMeta.queues.dashboard.length).to.equal(0);
          expect(kibiMeta.queues.button.length).to.equal(0);
        });

        it('should NOT flush queues when changing the route from dashboard to dasboard app', function () {
          // manually populate queues
          kibiMeta.queues = {
            dashboard: [
              {
                definition: { id: 'dash1', query: 'query1' },
                callback: function () {}
              }
            ],
            button: [
              {
                definition: { id: 'button1', query: 'query1' },
                callback: function () {}
              }
            ]
          };
          const current = {
            $$route: {
              originalPath: '/dashboard/:id'
            }
          };
          const next = {
            $$route: {
              originalPath: '/dashboard/:id'
            }
          };

          $rootScope.$emit('$routeChangeStart', next, current);

          expect(kibiMeta.queues.dashboard.length).to.equal(1);
          expect(kibiMeta.queues.button.length).to.equal(1);
        });

        it('should not make next request after flushing the queue', function (done) {
          const expectedMeta1 = { hits: { total: 11 } };
          const expectedMeta2 = { hits: { total: 22 } };

          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const query1 = '{"index":["index_A"]}\nquery1';
          const query2 = '{"index":["index_A"]}\nquery2';
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
              definition: { id: 'dash1', query: query1 },
              callback: callback3Spy
            }
          ];

          kibiMeta.getMetaForDashboards(definitions);
          kibiMeta.flushQueues();

          pollUntil(
            function () {
              return callback1Spy.called && callback2Spy.called;
            },
            2000, 2,
            function (err) {
              if (err) {
                done(err);
              }

              // here before the check wait a bit to make sure
              // the second msearch and third callback were not called
              // in case a second callback was called twice or with a wrong data from the first call we would like to know
              setTimeout(function () {
                sinon.assert.calledOnce(msearchStub);
                expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1 + query2, getMeta: 'dashboards__dashboard__dashboard' });
                sinon.assert.calledOnce(callback1Spy);
                sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
                sinon.assert.calledOnce(callback2Spy);
                sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
                sinon.assert.notCalled(callback3Spy);
                sinon.assert.callOrder(msearchStub, callback1Spy, callback2Spy);
                done();
              }, 1000);
            }
          );
        });
      });

      describe('cache error', function () {

        beforeEach(function () {
          kibiMeta.updateStrategy('dashboards', 'batchSize', 1);
        });

        afterEach(function () {
          kibiMeta.updateStrategy('dashboards', 'batchSize', 2);
        });

        it('should not cache error response', function (done) {
          const expectedMeta1 = { error: 'ERROR' };
          const expectedMeta2 = { hits: { total: 22 } };

          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
          msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta2 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const query1 = '{"index":["index_A"]}\nquery1';
          const definitions = [
            {
              definition: { id: 'dash1', query: query1 },
              callback: callback1Spy
            },
            {
              definition: { id: 'dash1', query: query1 },
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
              sinon.assert.calledTwice(msearchStub);
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
              expect(msearchStub.getCall(1).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, 'ERROR');
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
              sinon.assert.callOrder(callback1Spy, callback2Spy);
              done();
            }
          );
        });
      });

      describe('cache no errors', function () {

        it('default policy - 3 definitions to trigger two msearch calls, response OK, third def identical to first one', function (done) {
          const expectedMeta1 = { hits: { total: 11 } };
          const expectedMeta2 = { hits: { total: 22 } };
          const expectedMeta3 = { hits: { total: 11 } };

          msearchStub.onCall(0).returns(Promise.resolve({ responses: [ expectedMeta1, expectedMeta2 ] }));
          const callback1Spy = sinon.spy();
          const callback2Spy = sinon.spy();
          const callback3Spy = sinon.spy();
          const query1 = '{"index":["index_A"]}\nquery1';
          const query2 = '{"index":["index_A"]}\nquery2';
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
              definition: { id: 'dash1', query: query1 },
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
              expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1 + query2, getMeta: 'dashboards__dashboard__dashboard' });
              sinon.assert.calledOnce(callback1Spy);
              sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
              sinon.assert.calledOnce(callback2Spy);
              sinon.assert.calledWith(callback2Spy, null, expectedMeta2);
              sinon.assert.calledOnce(callback3Spy);
              sinon.assert.calledWith(callback3Spy, null, expectedMeta1);
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

        msearchStub.onCall(0).returns(Promise.reject({ responses: [ expectedError1 ] }));
        msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
        const callback1Spy = sinon.spy();
        const query1 = '{"index":["index_A"]}\nquery1';
        const definitions = [
          {
            definition: { id: 'dash1', query: query1 },
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
            expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
            expect(msearchStub.getCall(1).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
            sinon.assert.calledOnce(callback1Spy);
            sinon.assert.calledWith(callback1Spy, null, expectedMeta1);
            done();
          }
        );
      });

      it('default strategy - 1 definitions, should failed after 1 unsuccessful retry', function (done) {
        const expectedError1 = { error: 'Sorry error' };
        msearchStub.onCall(0).returns(Promise.reject({ responses: [ expectedError1 ] }));
        msearchStub.onCall(1).returns(Promise.reject({ responses: [ expectedError1 ] }));
        const callback1Spy = sinon.spy();
        const query1 = '{"index":["index_A"]}\nquery1';
        const definitions = [
          {
            definition: { id: 'dash1', query: query1 },
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
            expect(msearchStub.getCall(0).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
            expect(msearchStub.getCall(1).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
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

    describe('single msearch fired twice, responses are coming out of order', function () {

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

        // first call will arrive late
        msearchStub.onCall(0).returns(new Promise (function (fulfill, reject) {
          setTimeout(function () {
            fulfill({ responses: [ expectedMetaA ] });
          }, 1000);
        }));
        msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMetaB ] }));

        const callbackSpy = sinon.spy();

        const queryA = '{"index":["index_A"]}\nqueryA';
        const definitionsA = [{
          definition: { id: 'dash1', query: queryA },
          callback: callbackSpy
        }];

        const queryB = '{"index":["index_A"]}\nqueryB';
        const definitionsB = [{
          definition: { id: 'dash1', query: queryB },
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
              sinon.assert.calledWith(callbackSpy, null, expectedMetaB);
              sinon.assert.callOrder(msearchStub, msearchStub, callbackSpy);
              done();
            }, 2000);
          }
        );
      });
    });

    describe('slow network', function () {

      beforeEach(function () {
        kibiMeta.updateStrategy('dashboards', 'batchSize', 1);
      });

      afterEach(function () {
        kibiMeta.updateStrategy('dashboards', 'batchSize', 2);
      });

      it('make sure that each of the definitions becomes unmutable after submitting it to the service', function (done) {
        const expectedError1 = { error: 'Sorry error' };

        const expectedMeta1 = {
          hits: {
            total: 1
          }
        };
        const expectedMeta2 = {
          hits: {
            total: 2
          }
        };

        msearchStub.onCall(0).returns(new Promise (function (fulfill, reject) {
          // we make the first response slow and then fail it
          // so we have time to try to change the queries in the definitions
          // before they are reused in second and third call
          setTimeout(function () {
            reject({ responses: [ expectedError1 ] });
          }, 1000);
        }));
        msearchStub.onCall(1).returns(Promise.resolve({ responses: [ expectedMeta1 ] }));
        msearchStub.onCall(2).returns(Promise.resolve({ responses: [ expectedMeta2 ] }));

        const callbackSpy1 = sinon.spy();
        const callbackSpy2 = sinon.spy();
        const query1 = '{"index":["index_1"]}\nquery1';
        const query1changed = '{"index":["index_1"]}\nquery1changed';
        const query2 = '{"index":["index_2"]}\nquery2';
        const query2changed = '{"index":["index_2"]}\nquery2changed';

        const definitions = [
          {
            definition: { id: 'dash1', query: query1 },
            callback: callbackSpy1
          },
          {
            definition: { id: 'dash2', query: query2 },
            callback: callbackSpy2
          }
        ];

        kibiMeta.getMetaForDashboards(definitions);
        // Now change the query in second definition
        definitions[0].definition.query = query1changed;
        definitions[1].definition.query = query2changed;

        pollUntil(
          function () {
            return callbackSpy1.called && callbackSpy2;
          },
          2000, 2,
          function (err) {
            if (err) {
              done(err);
            }

            sinon.assert.calledThrice(msearchStub);
            sinon.assert.calledOnce(callbackSpy1);
            sinon.assert.calledOnce(callbackSpy2);
            sinon.assert.calledWith(callbackSpy1, null, expectedMeta1);
            sinon.assert.calledWith(callbackSpy2, null, expectedMeta2);

            expect(msearchStub.getCall(1).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
            // here we expect that the second and third call to msearch will still have original queries
            expect(msearchStub.getCall(1).args[0]).to.eql({ body: query1, getMeta: 'dashboards__dashboard' });
            expect(msearchStub.getCall(2).args[0]).to.eql({ body: query2, getMeta: 'dashboards__dashboard' });
            sinon.assert.callOrder(msearchStub, msearchStub, callbackSpy1, msearchStub, callbackSpy2);
            done();
          }
        );
      });

    });
  });
});
