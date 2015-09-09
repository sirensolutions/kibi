var child_process = require('child_process');
var join = require('path').join;
var Promise = require('bluebird');

module.exports = function (grunt) {

  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');

  function npmDedupe(platform) {
    return new Promise(function (resolve, reject) {
      var command = 'npm dedupe';
      var cwd = join(grunt.config.get('build'), 'dist',
        grunt.config.get('pkg.name') + '-' + version + '-' + platform, 'src');
      var options = { cwd: cwd };

      grunt.log.writeln('Running npm dedupe in ' + cwd);
      child_process.exec(command, options, function (err, stdout, stderr) {
        if (err) {
          grunt.log.error(stderr);
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  }

  grunt.registerTask('npm_dedupe', 'Run npm dedupe on Windows targets', function () {
    return Promise.map(['windows', 'windows64'], npmDedupe).nodeify(this.async());
  });
};
