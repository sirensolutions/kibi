module.exports = function (grunt) {
  let pkg = grunt.config.get('pkg');

  grunt.registerTask('_build:packageJson', function () {
    const { sha, number, version } = grunt.config.get('build');

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords,
        version,
        kibi_version: pkg.kibi_version, // kibi: added to manage kibi version
        kibi_kibana_announcement: pkg.kibi_kibana_announcement, // kibi: added by kibi
        build: {
          number,
          sha
        },
        repository: pkg.repository,
        engines: {
          node: pkg.engines.node
        },
        dependencies: pkg.dependencies
      }, null, '  ')
    );
  });
};
