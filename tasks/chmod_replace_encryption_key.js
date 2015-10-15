var fs = require('fs');
var join = require('path').join;

module.exports = function (grunt) {
  grunt.registerTask('chmod_replace_encryption_key', 'Chmods bin/replace_encryption_key.sh', function () {
    var done = this.async();
    var path = join(grunt.config.get('build'), 'dist', grunt.config.get('pkg.name'), 'bin', 'replace_encryption_key.sh');
    fs.chmod(path, 0755, done);
  });
};
