module.exports = function createPackages(grunt) {
  let { config } = grunt;
  let { resolve } = require('path');
  let { execFile } = require('child_process');

  let Promise = require('bluebird'); // kibi: dependencies added by
  let mkdirp = Promise.promisify(require('mkdirp')); // kibi: dependencies added by
  let _ = require('lodash'); // kibi: dependencies added by
  let fs = require('fs'); // kibi: dependencies added by

  let buildPath = resolve(config.get('root'), 'build');
  let exec = async (cmd, args) => {
    grunt.log.writeln(` > ${cmd} ${args.join(' ')}`);
    await Promise.fromNode(cb => execFile(cmd, args, { cwd: buildPath }, cb));
  };


  let archives = async (platform) => {
    // kibana.tar.gz
    await exec('tar', ['-zchf', platform.tarPath, platform.buildName]);

    // kibana.zip
    if (/windows/.test(platform.name)) {
      await exec('zip', ['-rq', '-ll', platform.zipPath, platform.buildName]);
    } else {
      await exec('zip', ['-rq', platform.zipPath, platform.buildName]);
    }
  };

  // kibi: before building the archives we have to swap few native bindings
  // we already chnaged the versionedLinks.js task to copy node_modules instead of symlinking them
  // now lets swap the bindings
  function copyFile(source, target) {
    return new Promise(function (resolve, reject) {
      var rd = fs.createReadStream(source);
      rd.on('error', reject);
      var wr = fs.createWriteStream(target);
      wr.on('error', reject);
      wr.on('finish', resolve);
      rd.pipe(wr);
    });
  }

  var toCopy = [];
  grunt.config.get('platforms').forEach(({ name, buildDir }) => {
    var nodeVersion = 'v46';
    var sqliteBindingSrc;
    var sqliteBindingDestFolder;
    var sqliteBindingDest;
    var nodejavaBindingSrc = __dirname + '/../../resources/nodejavabridges/' + name + '/nodejavabridge_bindings.node';
    var nodejavaBindingDest = buildDir + '/node_modules/jdbc/node_modules/java/build/Release/nodejavabridge_bindings.node';
    switch (name) {
      case 'darwin-x64':
        sqliteBindingSrc   = __dirname + '/../../resources/nodesqlite3bindings/' + name + '/node-' + nodeVersion + '-darwin-x64/node_sqlite3.node';
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-darwin-x64';
        sqliteBindingDest = sqliteBindingDestFolder + '/node_sqlite3.node';
        break;
      case 'linux-x64':
        sqliteBindingSrc   = __dirname + '/../../resources/nodesqlite3bindings/' + name + '/node-' + nodeVersion + '-linux-x64/node_sqlite3.node';
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-linux-x64';
        sqliteBindingDest = sqliteBindingDestFolder + '/node_sqlite3.node';
        break;
      case 'linux-x86':
        sqliteBindingSrc = __dirname + '/../../resources/nodesqlite3bindings/' + name + '/node-' + nodeVersion + '-linux-ia32/node_sqlite3.node';
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-linux-ia32';
        sqliteBindingDest = sqliteBindingDestFolder + '/node_sqlite3.node';
        break;
      case 'windows':
        sqliteBindingSrc = __dirname + '/../../resources/nodesqlite3bindings/' + name + '/node-' + nodeVersion + '-win32-ia32/node_sqlite3.node';
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-win32-ia32';
        sqliteBindingDest = sqliteBindingDestFolder + '/node_sqlite3.node';
        break;
      case 'windows64':
        sqliteBindingSrc = __dirname + '/../../resources/nodesqlite3bindings/' + name + '/node-' + nodeVersion + '-win32-x64/node_sqlite3.node';
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-win32-x64';
        sqliteBindingDest = sqliteBindingDestFolder + '/node_sqlite3.node';
        break;
      default:
        throw new Error('Unknown platform: [' + name + ']');
    }

    toCopy.push({
      sqliteBindingSrc: sqliteBindingSrc,
      sqliteBindingDestFolder: sqliteBindingDestFolder,
      sqliteBindingDest: sqliteBindingDest,
      nodejavaBindingSrc: nodejavaBindingSrc,
      nodejavaBindingDest: nodejavaBindingDest
    });
  });
  // kibi: end

  grunt.registerTask('_build:archives', function () {

    // kibi: here swap files before building archives
    var copyOperations = _.map(toCopy, function (row) {
      return mkdirp(row.sqliteBindingDestFolder).then(function () {
        return copyFile(row.sqliteBindingSrc, row.sqliteBindingDest).then(function () {
          return copyFile(row.nodejavaBindingSrc, row.nodejavaBindingDest);
        });
      });
    });
    // kibi: end

    Promise.all(copyOperations).then(function () {
      grunt.log.ok('All native bindings replaced');
      return Promise.all(
        grunt.config.get('platforms')
        .map(async platform => {

          grunt.file.mkdir('target');
          await archives(platform);
        })
      );
    }).nodeify(this.async());

  });
};
