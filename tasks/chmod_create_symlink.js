var fs = require('fs');
var join = require('path').join;

module.exports = function (grunt) {
  grunt.registerTask('chmod_create_symlink', 'Chmods bin/create_symlink.sh', function () {
    var done = this.async();
    var path = join(grunt.config.get('build'), 'dist', grunt.config.get('pkg.name'), 'bin', 'create_symlink.sh');
    fs.chmod(path, 0755, done);
  });
};
