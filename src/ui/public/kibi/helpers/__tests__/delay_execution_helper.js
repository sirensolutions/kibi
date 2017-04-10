import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';
import DelayExecutionHelperProvider from 'ui/kibi/helpers/delay_execution_helper';

describe('Kibi Components', function () {
  let actualData;
  let executionCounter;
  let DelayExecutionHelper;
  let $timeout;
  let Promise;

  describe('delayExecutionHelper', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_Promise_, _$timeout_, Private) {
      Promise = _Promise_;
      $timeout = _$timeout_;
      DelayExecutionHelper = Private(DelayExecutionHelperProvider);
    }));

    afterEach(function () {
      $timeout.verifyNoPendingTasks();
    });

    const collectUniqueIds = function (newData, data) {
      if (data.ids === undefined) {
        data.ids = [];
      }
      _.each(newData, (d) => {
        if (data.ids.indexOf(d) === -1) {
          data.ids.push(d);
        }
      });
    };

    let timePointer = 0;
    const moveTimePointer = function (time) {
      $timeout.flush(time - timePointer);
      timePointer = time;
    };
    beforeEach(function () {
      timePointer = 0;
    });

    describe('cancel executions', function () {
      it('should pass errors other than cancel events', function (done) {
        const throwError = () => Promise.reject(new Error('this is to be expected'));
        const helper = new DelayExecutionHelper(_.noop, throwError, 100, DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT);

        helper.addEventData()
        .then(() => {
          done('there should be an error!');
        })
        .catch(() => {
          done();
        });
        moveTimePointer(150);
      });

      it('should ignore cancel events', function (done) {
        const helper = new DelayExecutionHelper(_.noop, _.noop, 100, DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT);

        helper.addEventData()
        .then(() => {
          done();
        })
        .catch(() => {
          done('should ignore cancel event');
        });
        moveTimePointer(50);
        helper.addEventData();
        moveTimePointer(150);
      });
    });

    describe('DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT', function () {

      // e1   cancel     X
      //  |___delay______|
      it('1 event and then cancel before "delay" - should not trigger any callback', function () {
        let actualData = [];
        let executionCounter = 0;
        const helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actualData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // trigger cancel
        // t < delay
        moveTimePointer(50);
        helper.cancel();

        // verify that callback was never called
        // even t > delay * 3
        moveTimePointer(320);
        expect(actualData).to.eql([]);
        expect(executionCounter).to.equal(0);
      });

      // e1         e2   X         C1
      //  |__delay___|___|         |
      //             |_____________|
      it('2 events triggered inside "delay" - callback should be triggered a "delay" after second event', function () {
        let actualData = [];
        let executionCounter = 0;
        const helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actualData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // trigger second event < delay
        moveTimePointer(50);
        helper.addEventData(['id2']);

        moveTimePointer(80);
        // verify that callback not executed
        // t < delay
        expect(actualData).to.have.length(0);
        expect(executionCounter).to.equal(0);

        moveTimePointer(120);
        // verify that callback not executed
        // delay < t < 2 * delay
        expect(actualData).to.have.length(0);
        expect(executionCounter).to.equal(0);

        moveTimePointer(220);
        // verify that callback executed once after
        // 2 * delay < t
        expect(actualData).to.eql(['id1', 'id2']);
        expect(executionCounter).to.equal(1);

        moveTimePointer(320);
        // verify that callback not executed again
        // 3 * delay < t
        expect(actualData).to.eql(['id1', 'id2']);
        expect(executionCounter).to.equal(1);
      });

      // e1          C1    e2         C2
      //  |__delay___|     |__delay___|
      it(
      '2 events triggered more than "delay" apart - should trigger the callback twice ' +
      'a "delay" after first event and a "delay" after second event', function () {
        let actualData = [];
        let executionCounter = 0;
        const helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actualData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);

        moveTimePointer(50);
        // verify that callback not executed
        // t < delay after first event
        expect(actualData).to.have.length(0);
        expect(executionCounter).to.equal(0);

        moveTimePointer(150);
        // verify that callback executed
        // t > delay after first event
        expect(actualData).to.eql(['id1']);
        expect(executionCounter).to.equal(1);

        // add data from second event after the delay timeout
        moveTimePointer(300);
        helper.addEventData(['id2']);

        moveTimePointer(350);
        // verify that callback not executed again
        // t < delay after second event
        expect(actualData).to.eql(['id1']);
        expect(executionCounter).to.equal(1);

        moveTimePointer(450);
        // verify that callback executed again
        // t > delay after second event
        expect(actualData).to.eql(['id2']);
        expect(executionCounter).to.equal(2);

        moveTimePointer(550);
        // verify that callback not executed again
        // t > 2 * delay after second event
        expect(actualData).to.eql(['id2']);
        expect(executionCounter).to.equal(2);
      });
    });

    describe('DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT', function () {

      // e1   cancel     X
      //  |___delay______|
      it('1 event and then cancel before "delay" - should not trigger any callback', function () {
        let actualData = [];
        let executionCounter = 0;
        const helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actualData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // trigger cancel
        // t < delay
        moveTimePointer(50);
        helper.cancel();

        moveTimePointer(320);
        // verify that callback not never called
        // even t > delay * 3
        expect(actualData).to.eql([]);
        expect(executionCounter).to.equal(0);
      });

      // e1   e2     C1
      //  |__delay___|
      it('2 events triggered inside "delay" - callback should be triggerd after a "delay" after first event', function () {
        let actualData = [];
        let executionCounter = 0;
        const helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actualData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);
        // add data from second event before the delay timeout
        moveTimePointer(50);
        helper.addEventData(['id2']);

        moveTimePointer(80);
        // verify that callback not executed
        // t < delay
        expect(actualData).to.eql([]);
        expect(executionCounter).to.equal(0);

        moveTimePointer(120);
        // verify that callback executed
        // 2 * delay < t < delay
        expect(actualData).to.eql(['id1', 'id2']);
        expect(executionCounter).to.equal(1);

        moveTimePointer(220);
        // verify that callback not executed again
        // 2 * delay < t
        expect(actualData).to.eql(['id1', 'id2']);
        expect(executionCounter).to.equal(1);
      });

      // e1          C1    e2         C2
      //  |__delay___|     |__delay___|
      it(
      '2 events triggered more than "delay" apart - should trigger the callback twice ' +
      'a "delay" after first event and a "delay" after second event', function () {
        let actualData = [];
        let executionCounter = 0;
        const helper = new DelayExecutionHelper(
          collectUniqueIds,
          function (data) {
            executionCounter++;
            actualData = data.ids;
          },
          100,
          DelayExecutionHelper.DELAY_STRATEGY.DO_NOT_RESET_COUNTER_ON_NEW_EVENT
        );

        helper.addEventData(['id1']);

        moveTimePointer(50);
        // verify that callback not executed
        // t < delay after first event
        expect(actualData).to.eql([]);
        expect(executionCounter).to.equal(0);

        moveTimePointer(150);
        // verify that callback executed
        // t > delay after first event
        expect(actualData).to.eql(['id1']);
        expect(executionCounter).to.equal(1);

        // add data from second event after the delay timeout
        moveTimePointer(300);
        helper.addEventData(['id2']);

        moveTimePointer(350);
        // verify that callback not executed again
        // t < delay after second event
        expect(actualData).to.eql(['id1']);
        expect(executionCounter).to.equal(1);

        moveTimePointer(450);
        // verify that callback executed again
        // t > delay after second event
        expect(actualData).to.eql(['id2']);
        expect(executionCounter).to.equal(2);

        moveTimePointer(550);
        // verify that callback not executed again
        // t > 2 * delay after second event
        expect(actualData).to.eql(['id2']);
        expect(executionCounter).to.equal(2);
      });
    });

  });
});
