module.exports = function (grunt) {
  let { defaults } = require('lodash');

  let pkg = grunt.config.get('pkg');
  let deepModules = grunt.config.get('deepModules');

  grunt.registerTask('_build:packageJson', function () {

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords,
        version: pkg.version,
        kibi_version: pkg.kibi_version, // kibi: added to manage kibi version
        kibi_kibana_announcement: pkg.kibi_kibana_announcement, // kibi: added by kibi
        build: {
          number: grunt.config.get('buildNum'),
          sha: grunt.config.get('buildSha')
        },
        repository: pkg.repository,
        engines: {
          node: pkg.engines.node
        },
        dependencies: defaults({}, pkg.dependencies, deepModules)
      }, null, '  ')
    );
  });
};
