var fs = require('fs');
var join = require('path').join;

module.exports = function (grunt) {
  grunt.registerTask('chmod_kibana', 'Chmods bin/<%= pkg.name %>', function () {
    var done = this.async();
    var path = join(grunt.config.get('build'), 'dist', grunt.config.get('pkg.name'), 'bin', grunt.config.get('pkg.name'));
    fs.chmod(path, 0755, done);
  });
};
