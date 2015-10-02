var child_process = require('child_process');
var join = require('path').join;
var statSync = require('fs').statSync;

module.exports = function (grunt) {
  var srcPath = join(grunt.config.get('build'), 'dist', grunt.config.get('pkg.name'), 'src');

  grunt.registerTask('npm_shrinkwrap_exists', 'Ensure npm shrinkwrap file exists', function () {
    try {
      statSync(join(srcPath, 'npm-shrinkwrap.json'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      grunt.fail.warn('Releases require an npm-shrinkwrap.json file to exist');
    }
  });
};


