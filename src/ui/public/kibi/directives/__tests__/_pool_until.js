function _pool(f, maxTimeInMs, stepInMs, callback, stopTime) {
  if (f()) {
    if (callback) {
      callback();
    }
    return;
  }
  var currentTime = new Date().getTime();
  if (currentTime >= stopTime && callback) {
    callback(new Error('Max time ' + maxTimeInMs + ' reached\nCurrent time ' + currentTime + ' '));
    return;
  }
  setTimeout(function () {
    _pool(f, maxTimeInMs, stepInMs, callback, stopTime);
  }, stepInMs);
};

function poolUntil(f, maxTimeInMs, stepInMs, callback) {
  _pool(f, maxTimeInMs, stepInMs, callback, new Date().getTime() + maxTimeInMs);
};

module.exports = poolUntil;
