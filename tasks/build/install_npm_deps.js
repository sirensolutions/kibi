module.exports = function (grunt) {
  const { exec } = require('child_process');
  const { resolve } = require('path');
  // siren: if on windows, use where.exe to find python path
  const getPythonPath = (/^win/).test(process.platform) ? '"$(where.exe python2)"' : '$(which python2)';
  grunt.registerTask('_build:installNpmDeps', function () {
    grunt.file.mkdir('build/kibana/node_modules');

    exec(`npm install  --production --no-optional --python=${getPythonPath}`, { // siren: specify python path
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};
