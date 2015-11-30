var child_process = require('child_process');
var join = require('path').join;
var statSync = require('fs').statSync;

module.exports = function (grunt) {
  var root = grunt.config.get('root');

  grunt.registerTask('npm_shrinkwrap_exists', 'Ensure npm shrinkwrap file exists', function () {
    try {
      statSync(join(root, 'npm-shrinkwrap.json'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      grunt.fail.warn('Releases require an npm-shrinkwrap.json file to exist');
    }
  });
};
