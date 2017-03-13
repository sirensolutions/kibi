const expect = require('expect.js');
const _ = require('lodash');
const DelayExecutionHelper = require('ui/kibi/helpers/delay_execution_helper');

let actuallData;
let executionCounter;

describe('Kibi Components', function () {
  describe('delayExecutionHelper', function () {

    var collectUniqueIds = function (newData, data) {
      if (data.ids === undefined) {
        data.ids = [];
      }
      _.each(newData, (d) => {
        if (data.ids.indexOf(d) === -1) {
          data.ids.push(d);
        }
      });
    };


    describe('DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT', function () {

      // e1   cancel     X
      //  |___delay______|
      it('1 event and then cancel before "delay" - should not trigger any callback', function (done) {
        var actuallData = [];
        var executionCounter = 0;
        var helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actuallData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // trigger cancel
        // t < delay
        setTimeout(function () {
          helper.cancel();
        }, 50);

        setTimeout(function () {
          // verify that callback not never called
          // even t > delay * 3
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
          done();
        }, 320);
      });

      // e1         e2   X         C1
      //  |__delay___|___|         |
      //             |_____________|
      it('2 events triggered inside "delay" - callback should be triggered a "delay" after second event', function (done) {
        var actuallData = [];
        var executionCounter = 0;
        var helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actuallData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // trigger second event < delay
        setTimeout(function () {
          helper.addEventData(['id2']);
        }, 50);

        setTimeout(function () {
          // verify that callback not executed
          // t < delay
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
        }, 80);
        setTimeout(function () {
          // verify that callback not executed
          // 2 * delay < t < delay
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
        }, 120);
        setTimeout(function () {
          // verify that callback executed once after
          // 2 * delay < t
          expect(actuallData).to.eql(['id1', 'id2']);
          expect(executionCounter).to.equal(1);
        }, 220);
        setTimeout(function () {
          // verify that callback not executed again
          // 3 * delay < t
          expect(actuallData).to.eql(['id1', 'id2']);
          expect(executionCounter).to.equal(1);
          done();
        }, 320);

      });

      // e1          C1    e2         C2
      //  |__delay___|     |__delay___|
      it(
      '2 events triggered more than "delay" apart - should trigger the callback twice ' +
      'a "delay" after first event and a "delay" after second event', function (done) {
        var actuallData = [];
        var executionCounter = 0;
        var helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actuallData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // add data from second event after the delay timeout
        setTimeout(function () {
          helper.addEventData(['id2']);
        }, 300);

        setTimeout(function () {
          // verify that callback not executed
          // t < delay after first event
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
        }, 50);

        setTimeout(function () {
          // verify that callback executed
          // t > delay after first event
          expect(actuallData).to.eql(['id1']);
          expect(executionCounter).to.equal(1);
        }, 150);

        setTimeout(function () {
          // verify that callback not executed again
          // t < delay after second event
          expect(actuallData).to.eql(['id1']);
          expect(executionCounter).to.equal(1);
          done();
        }, 350);

        setTimeout(function () {
          // verify that callback executed again
          // t > delay after second event
          expect(actuallData).to.eql(['id2']);
          expect(executionCounter).to.equal(2);
          done();
        }, 450);

        setTimeout(function () {
          // verify that callback not executed again
          // t > 2 * delay after second event
          expect(actuallData).to.eql(['id2']);
          expect(executionCounter).to.equal(2);
          done();
        }, 550);

      });
    });

    describe('DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT', function () {

      // e1   cancel     X
      //  |___delay______|
      it('1 event and then cancel before "delay" - should not trigger any callback', function (done) {
        var actuallData = [];
        var executionCounter = 0;
        var helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actuallData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // trigger cancel
        // t < delay
        setTimeout(function () {
          helper.cancel();
        }, 50);

        setTimeout(function () {
          // verify that callback not never called
          // even t > delay * 3
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
          done();
        }, 320);
      });

      // e1   e2     C1
      //  |__delay___|
      it('2 events triggered inside "delay" - callback should be triggerd after a "delay" after first event', function (done) {
        var actuallData = [];
        var executionCounter = 0;
        var helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actuallData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // add data from second event before the delay timeout
        setTimeout(function () {
          helper.addEventData(['id2']);
        }, 50);

        setTimeout(function () {
          // verify that callback not executed
          // t < delay
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
        }, 80);
        setTimeout(function () {
          // verify that callback executed
          // 2 * delay < t < delay
          expect(actuallData).to.eql(['id1', 'id2']);
          expect(executionCounter).to.equal(1);
        }, 120);
        setTimeout(function () {
          // verify that callback not executed again
          // 2 * delay < t
          expect(actuallData).to.eql(['id1', 'id2']);
          expect(executionCounter).to.equal(1);
          done();
        }, 220);

      });

      // e1          C1    e2         C2
      //  |__delay___|     |__delay___|
      it(
      '2 events triggered more than "delay" apart - should trigger the callback twice ' +
      'a "delay" after first event and a "delay" after second event', function (done) {
        var actuallData = [];
        var executionCounter = 0;
        var helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actuallData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // add data from second event after the delay timeout
        setTimeout(function () {
          helper.addEventData(['id2']);
        }, 300);

        setTimeout(function () {
          // verify that callback not executed
          // t < delay after first event
          expect(actuallData).to.eql([]);
          expect(executionCounter).to.equal(0);
        }, 50);

        setTimeout(function () {
          // verify that callback executed
          // t > delay after first event
          expect(actuallData).to.eql(['id1']);
          expect(executionCounter).to.equal(1);
        }, 150);

        setTimeout(function () {
          // verify that callback not executed again
          // t < delay after second event
          expect(actuallData).to.eql(['id1']);
          expect(executionCounter).to.equal(1);
          done();
        }, 350);

        setTimeout(function () {
          // verify that callback executed again
          // t > delay after second event
          expect(actuallData).to.eql(['id2']);
          expect(executionCounter).to.equal(2);
          done();
        }, 450);

        setTimeout(function () {
          // verify that callback not executed again
          // t > 2 * delay after second event
          expect(actuallData).to.eql(['id2']);
          expect(executionCounter).to.equal(2);
          done();
        }, 550);

      });
    });

  });
});
