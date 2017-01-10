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
function DelayExecutionHelper(collectDataCallback, executeCallback, delayTime, delayStrategy) {
  this.collectDataCallback = collectDataCallback;
  this.executeCallback = executeCallback;
  this.delayTime = delayTime;
  this.delayStrategy = delayStrategy;
  this.data = {};
  this.timeout;
}

DelayExecutionHelper.DELAY_STRATEGY = {
  RESET_COUNTER_ON_NEW_EVENT: 'RESET_COUNTER_ON_NEW_EVENT',
  DO_NOT_RESET_COUNTER_ON_NEW_EVENT: 'DO_NOT_RESET_COUNTER_ON_NEW_EVENT'
};

DelayExecutionHelper.prototype.addEventData = function (data) {
  this.collectDataCallback(data, this.data);
  if (this.delayStrategy === DelayExecutionHelper.DELAY_STRATEGY.RESET_COUNTER_ON_NEW_EVENT) {
    clearTimeout(this.timeout);
  }
  this.timeout = setTimeout(() => {
    this.executeCallback(this.data);
    this.data = {};
    clearTimeout(this.timeout);
  }, this.delayTime);
};

DelayExecutionHelper.prototype.cancel = function () {
  this.data = {};
  if (this.timeout) {
    clearTimeout(this.timeout);
  }
};

export default DelayExecutionHelper;
