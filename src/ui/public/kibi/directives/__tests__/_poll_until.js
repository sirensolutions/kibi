function _poll(f, maxTimeInMs, stepInMs, callback, stopTime) {
  if (f()) {
    if (callback) {
      callback();
    }
    return;
  }
  const currentTime = new Date().getTime();
  if (currentTime >= stopTime && callback) {
    callback(new Error('Max time ' + maxTimeInMs + ' reached\nCurrent time ' + currentTime + ' '));
    return;
  }
  setTimeout(function () {
    _poll(f, maxTimeInMs, stepInMs, callback, stopTime);
  }, stepInMs);
};

/**
 * Utility method to observe a function @f every @stepInMs ms for a maximum period of @maxTimeInMs ms
 * When observed function return true a @calback function is immediatelly triggered
 * When observed function do not return true within @maxTimeInMs time then a @callback function is triggered with an error
 *
 * This method is useful to watch for a change of a property in an object:
 *
 * var o = {p: undefined};
 * pooolUntil(
 *   () => {
 *     return o.p !== undefined;
 *   },
 *   150, 1,
 *   () => {
 *     alert('Property p finally set')
 *   }
 * );
 */
function pollUntil(f, maxTimeInMs, stepInMs, callback) {
  _poll(f, maxTimeInMs, stepInMs, callback, new Date().getTime() + maxTimeInMs);
};

module.exports = pollUntil;
