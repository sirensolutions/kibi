module.exports = function (grunt) {
  let { basename, resolve } = require('path');
  let { forOwn } = require('lodash');

  let exec = require('../utils/exec').silent;

  grunt.registerTask('_build:versionedLinks', function () {
    let rootPath = grunt.config.get('root');

    let buildFiles = grunt.file.expand('build/kibana/{*,.*}')
    .map(function (file) {
      return resolve(rootPath, file);
    });

    //We don't want to build os packages with symlinks
    let transferFiles = (source, link, forceCopy) => (forceCopy || grunt.option('os-packages')) //kibi: added the forceCopy param
      ? exec('cp', ['-r', source, link])
      : exec('ln', ['-s', source, link]);

    grunt.config.get('platforms').forEach(function (platform) {
      grunt.file.mkdir(platform.buildDir);

      // link all files at the root of the build
      buildFiles.forEach(function (source) {
        // kibi: as we have to swap few files (native bindings) for each archive we will always copy (the true parameter)
        // TODO kibi: here we could optimize and instead of copying everything
        // symlink everything except 2 modules
        transferFiles(source, resolve(platform.buildDir, basename(source)), true);
      });

      // link the node modules
      transferFiles(platform.nodeDir, resolve(platform.buildDir, 'node'));
    });
  });
};
