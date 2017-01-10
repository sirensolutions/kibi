const _ = require('lodash');
const Promise = require('bluebird');

module.exports = Promise.method(function (kbnServer, server) {
  const self = this;

  const clean = _.once(function (code) {

    return kbnServer.cleaningArray.reduce(function (p, task) {
      return p.then(task());
    }, Promise.resolve());
  });

  process.once('exit', clean) // for "natural" exits. Taken from 4.6.1 merge
  .once('SIGTERM', function () {

    // for Ctrl-C exits
    clean().finally(function () {

      // resend SIGINT
      process.kill(process.pid, 'SIGTERM');
    });
  })
  .once('SIGINT', function () {

    clean().finally(function () {

      // resend SIGINT
      process.kill(process.pid, 'SIGINT');
    });
  });

  return true;
});
