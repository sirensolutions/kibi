let _ = require('lodash');
let Boom = require('boom');
let Promise = require('bluebird');
let writeFile = Promise.promisify(require('fs').writeFile);
let unlink = Promise.promisify(require('fs').unlinkSync);

module.exports = Promise.method(function (kbnServer, server, config) {
  let path = config.get('pid.file');
  if (!path) return;

  let pid = String(process.pid);

  return writeFile(path, pid, { flag: 'wx' })
  .catch(function (err) {
    if (err.code !== 'EEXIST') throw err;

    let log = {
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

    let clean = _.once(function (code) {
      return unlink(path); // kibi: unlink is promisified
    });

    kbnServer.cleaningArray.push(clean); // Kibi: added to manage the cleanup function
  });
});
