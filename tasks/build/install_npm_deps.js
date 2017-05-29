import { exec } from 'child_process';
module.exports = function (grunt) {
  // kibi: if on windows, use where.exe to find python path
  const pythonPath = (/^win/).test(process.platform) ? '"$(where.exe python2)"' : '$(which python2)';
  grunt.registerTask('_build:installNpmDeps', function () {
    grunt.file.mkdir('build/kibana/node_modules');

    exec(`npm install  --production --no-optional --python=${pythonPath}`, { // kibi: specify python path
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};
