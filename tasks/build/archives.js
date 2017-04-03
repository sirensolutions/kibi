import { execFile } from 'child_process';
import Promise from 'bluebird';
import { resolve } from 'path';
import _ from 'lodash'; // kibi: dependencies added by
import fs from 'fs'; // kibi: dependencies added by

export default (grunt) => {
  const { config, log } = grunt;

  const mkdirp = Promise.promisify(require('mkdirp')); // kibi: dependencies added by

  const buildPath = resolve(config.get('root'), 'build');
  const exec = async (cmd, args) => {
    log.writeln(` > ${cmd} ${args.join(' ')}`);
    await Promise.fromNode(cb => execFile(cmd, args, { cwd: buildPath }, cb));
  };

  async function archives({ name, buildName, zipPath, tarPath }) {
    await exec('tar', ['-chzf', tarPath, buildName]);

    if (/windows/.test(name)) {
      await exec('zip', ['-rq', '-ll', zipPath, buildName]);
    } else {
      await exec('zip', ['-rq', zipPath, buildName]);
    }
  };

  // kibi: before building the archives we have to swap few native bindings
  // we already chnaged the versionedLinks.js task to copy node_modules instead of symlinking them
  // now lets swap the bindings
  function copyFile(source, target) {
    return new Promise(function (resolve, reject) {
      const rd = fs.createReadStream(source);
      rd.on('error', reject);
      const wr = fs.createWriteStream(target);
      wr.on('error', reject);
      wr.on('finish', resolve);
      rd.pipe(wr);
    });
  }

  const toCopy = [];
  config.get('platforms').forEach(({ name, buildDir }) => {
    const nodeVersion = 'v48';
    let sqliteBindingSrc;
    let sqliteBindingDestFolder;
    let sqliteBindingDest;
    const nodejavaBindingSrc = __dirname + '/../../resources/nodejavabridges/' + name + '/nodejavabridge_bindings.node';
    const nodejavaBindingDest = buildDir + '/node_modules/java/build/Release/nodejavabridge_bindings.node';
    switch (name) {
      case 'darwin-x86_64':
        sqliteBindingSrc   = `${__dirname}/../../resources/nodesqlite3bindings/${name}/node-${nodeVersion}-darwin-x64/node_sqlite3.node`;
        sqliteBindingDestFolder = `${buildDir}/node_modules/sqlite3/lib/binding/node-${nodeVersion}-darwin-x64`;
        break;
      case 'linux-x86_64':
        sqliteBindingSrc   = `${__dirname}/../../resources/nodesqlite3bindings/${name}/node-${nodeVersion}-linux-x64/node_sqlite3.node`;
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-linux-x64';
        break;
      case 'linux-x86':
        sqliteBindingSrc   = `${__dirname}/../../resources/nodesqlite3bindings/${name}/node-${nodeVersion}-linux-ia32/node_sqlite3.node`;
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-linux-ia32';
        break;
      case 'windows-x86':
        sqliteBindingSrc   = `${__dirname}/../../resources/nodesqlite3bindings/${name}/node-${nodeVersion}-win32-ia32/node_sqlite3.node`;
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-win32-ia32';
        break;
      case 'windows64':
        sqliteBindingSrc   = `${__dirname}/../../resources/nodesqlite3bindings/${name}/node-${nodeVersion}-win32-x64/node_sqlite3.node`;
        sqliteBindingDestFolder = buildDir + '/node_modules/sqlite3/lib/binding/node-' + nodeVersion + '-win32-x64';
        break;
      default:
        throw new Error('Unknown platform: [' + name + ']');
    }
    sqliteBindingDest = `${sqliteBindingDestFolder}/node_sqlite3.node`;

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
    const copyOperations = _.map(toCopy, function (row) {
      return mkdirp(row.sqliteBindingDestFolder).then(function () {
        return copyFile(row.sqliteBindingSrc, row.sqliteBindingDest).then(function () {
          return copyFile(row.nodejavaBindingSrc, row.nodejavaBindingDest);
        });
      });
    });
    // kibi: end

    Promise.all(copyOperations).then(function () {
      log.ok('All native bindings replaced');
      return Promise.all(
        config.get('platforms')
        .map(async platform => {

          grunt.file.mkdir('target');
          await archives(platform);
        })
      );
    }).nodeify(this.async());
  });
};
