var child_process = require('child_process');
var Promise = require('bluebird');
var join = require('path').join;
var mkdirp = Promise.promisifyAll(require('mkdirp'));
var execFile = Promise.promisify(child_process.execFile);
var fs = require('fs'); // added by kibi

var getBaseNames = function (grunt) {
  var packageName = grunt.config.get('pkg.name');
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');
  return platforms.map(function (platform) {
    return packageName + '-' + version + '-' + platform;
  });
};


// added by kibi
var _endsWith = function (s, suffix) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};
var mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
  } catch (e) {
    if ( e.code !== 'EEXIST' ) throw e;
  }
};

function copyNodeSqlite3Bindings(name, distPath) {
  var from;
  var toFolder;
  if (_endsWith(name, '-darwin-x64')) {
    from = __dirname + '/../resources/nodesqlite3bindings/darwin-x64/node-v11-darwin-x64/node_sqlite3.node';
    toFolder = distPath + '/' + name + '/' + 'src/node_modules/sqlite3/lib/binding/node-v11-darwin-x64';
  }
  if (_endsWith(name, '-linux-x64')) {
    from = __dirname + '/../resources/nodesqlite3bindings/linux-x64/node-v11-linux-x64/node_sqlite3.node';
    toFolder = distPath + '/' + name + '/' + 'src/node_modules/sqlite3/lib/binding/node-v11-linux-x64';
  }
  if (_endsWith(name, '-linux-x86')) {
    from = __dirname + '/../resources/nodesqlite3bindings/linux-x86/node-v11-linux-ia32/node_sqlite3.node';
    toFolder = distPath + '/' + name + '/' + 'src/node_modules/sqlite3/lib/binding/node-v11-linux-ia32';
  }
  if (_endsWith(name, '-windows')) {
    from = __dirname + '/../resources/nodesqlite3bindings/windows/node-v11-win32-ia32/node_sqlite3.node';
    toFolder = distPath + '/' + name + '/' + 'src/node_modules/sqlite3/lib/binding/node-v11-win32-ia32';
  }
  if (_endsWith(name, '-windows64')) {
    from = __dirname + '/../resources/nodesqlite3bindings/windows64/node-v11-win32-x64/node_sqlite3.node';
    toFolder = distPath + '/' + name + '/' + 'src/node_modules/sqlite3/lib/binding/node-v11-win32-x64';
  }

  if (from && toFolder) {
    var to = toFolder + '/node_sqlite3.node';
    mkdirSync(toFolder);
    fs.createReadStream(from).pipe(fs.createWriteStream(to));
  }
}

function copyNodeJavaBindings(name, distPath) {
  var from;
  if (_endsWith(name, '-darwin-x64')) {
    from = __dirname + '/../resources/nodejavabridges/darwin-x64/nodejavabridge_bindings.node';
  }
  if (_endsWith(name, '-linux-x64')) {
    from = __dirname + '/../resources/nodejavabridges/linux-x64/nodejavabridge_bindings.node';
  }
  if (_endsWith(name, '-linux-x86')) {
    from = __dirname + '/../resources/nodejavabridges/linux-x86/nodejavabridge_bindings.node';
  }
  if (_endsWith(name, '-windows')) {
    from = __dirname + '/../resources/nodejavabridges/windows/nodejavabridge_bindings.node';
  }
  if (_endsWith(name, '-windows64')) {
    from = __dirname + '/../resources/nodejavabridges/windows64/nodejavabridge_bindings.node';
  }

  if (from) {
    var to = distPath + '/' + name + '/' +
             'src/node_modules/jdbc-sindicetech/node_modules/java/build/Release/nodejavabridge_bindings.node';
    fs.createReadStream(from).pipe(fs.createWriteStream(to));
  }
}


function createPackages(grunt) {
  grunt.registerTask('create_packages', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var distPath = join(grunt.config.get('build'), 'dist');
    var version = grunt.config.get('pkg.version');
    var packageName = grunt.config.get('pkg.name');

    var createPackage = function (name) {
      var options = { cwd: distPath };
      var archiveName = join(target, name);
      var commands = [];
      var arch = /x64$/.test(name) ? 'x86_64' : 'i686';

      // sindicetech added - to make the correct build with java bindings
      copyNodeJavaBindings(name, distPath);
      copyNodeSqlite3Bindings(name, distPath);
      // end of sindicetech

      var fpm_options = [ 'fpm', '-f', '-p', target, '-s', 'dir', '-n', packageName, '-v', version,
                          '--after-install', join(distPath, 'user', 'installer.sh'),
                          '--after-remove', join(distPath, 'user', 'remover.sh'),
                          '--config-files', '/opt/' + packageName + '/config/' + packageName + '.yml' ];
      var fpm_files = join(distPath, name) + '/=/opt/' + packageName;

      commands.push([ 'tar', '-zcf', archiveName + '.tar.gz', name ]);

      if (/windows/.test(name)) {
        commands.push([ 'zip', '-rq', '-ll', archiveName + '.zip', name ]);
      } else {
        commands.push([ 'zip', '-rq', archiveName + '.zip', name ]);
      }

      if (grunt.option('os-packages')) {
        // TODO(sissel): Add before-install scripts to create app user
        // TODO(sissel): Check if `fpm` is available
        if (/linux-x(86|64)$/.test(name)) {
          var sysv_init = join(distPath, 'services', 'sysv') + '/etc/=/etc/';
          commands.push(fpm_options.concat(['-t', 'rpm', '-a', arch, '--rpm-os', 'linux', fpm_files, sysv_init]));
          commands.push(fpm_options.concat(['-t', 'deb', '-a', arch, fpm_files, sysv_init]));
        } else if (/darwin-x(86|64)$/.test(name)) {
          var launchd = join(distPath, 'services', 'launchd') + '/=/';
          commands.push(fpm_options.concat(['-t', 'osxpkg', '-a', arch, fpm_files, launchd]));
        }
      }

      return mkdirp.mkdirpAsync(target)
        .then(function (arg) {
          return Promise.map(commands, function (cmd) {
            return execFile(cmd.shift(), cmd, options);
          });
        }, function (err) { console.log('Failure on ' + name + ': ' + err); })
        .error(function (err) {
          console.log('Failure on ' + name );
          console.log(err);
        });
    };

    Promise.map(getBaseNames(grunt), createPackage).finally(done);
  });
}

module.exports = createPackages;
createPackages.getBaseNames = getBaseNames;
