/*
* Triggers the executeCallback callback after delay counted from first call to
  * addData method. After triggering executeCallback the collectedData are cleared and
  * helper is ready to accept new calls to addEventData
  *
  * - collectDataCallback - function that collects and process new data
  * collectDataCallback(alreadyCollectedData, newData)
  * - executeCallback - function executed after delay with all collected data
  * executeCallback(alreadyCollectedData)
  * - delayTime - delay time in ms
  * - delayStrategy - strategy of the delay
  *
  */
export default function DelayExecutionHelperFactory($timeout) {
  class DelayExecutionHelper {
    static get DELAY_STRATEGY() {
      return {
        RESET_COUNTER_ON_NEW_EVENT: 'RESET_COUNTER_ON_NEW_EVENT',
        DO_NOT_RESET_COUNTER_ON_NEW_EVENT: 'DO_NOT_RESET_COUNTER_ON_NEW_EVENT'
      };
    }

    constructor(collectDataCallback, executeCallback, delayTime, delayStrategy) {
      this.collectDataCallback = collectDataCallback;
      this.executeCallback = executeCallback;
      this.delayTime = delayTime;
      this.delayStrategy = delayStrategy;
      this.data = {};
      this.timeout;
    }

    addEventData(data) {
      this.collectDataCallback(data, this.data);
      if (this.timeout && this.delayStrategy === DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT) {
        $timeout.cancel(this.timeout);
      }
      this.timeout = $timeout(() => {
        const ret = this.executeCallback(this.data);
        if (ret && typeof ret.then === 'function') {
          return ret.then(() => this.cancel());
        } else {
          this.cancel();
        }
      }, this.delayTime);
      return this.timeout;
    }

    cancel() {
      this.data = {};
      if (this.timeout) {
        $timeout.cancel(this.timeout);
        this.timeout = null;
      }
    }
  }

  return DelayExecutionHelper;
};
