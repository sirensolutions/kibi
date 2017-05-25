import _ from 'lodash';
import Boom from 'boom';
import Promise from 'bluebird';
const writeFile = Promise.promisify(require('fs').writeFile);
const unlink = Promise.promisify(require('fs').unlinkSync); // kibi: unlink is promisified

module.exports = Promise.method(function (kbnServer, server, config) {
  const path = config.get('pid.file');
  if (!path) return;

  const pid = String(process.pid);

  return writeFile(path, pid, { flag: 'wx' })
  .catch(function (err) {
    if (err.code !== 'EEXIST') throw err;

    const log = {
      tmpl: 'pid file already exists at <%= path %>',
      path: path,
      pid: pid
    };

    if (config.get('pid.exclusive')) {
      throw Boom.create(500, _.template(log.tmpl)(log), log);
    } else {
      server.log(['pid', 'warning'], log);
    }

    return writeFile(path, pid);
  })
  .then(function () {

    server.log(['pid', 'debug'], {
      tmpl: 'wrote pid file to <%= path %>',
      path: path,
      pid: pid
    });

    const clean = _.once(function () {
      return unlink(path); // kibi: unlink is promisified
    });

    kbnServer.cleaningArray.push(clean); // Kibi: added to manage the cleanup function
    process.once('exit', clean); // for "natural" exits
    process.once('SIGINT', function () { // for Ctrl-C exits
      clean();

      // resend SIGINT
      process.kill(process.pid, 'SIGINT');
    });

    process.on('unhandledRejection', function (reason) {
      server.log(['warning'], `Detected an unhandled Promise rejection.\n${reason}`);
    });
  });
});
