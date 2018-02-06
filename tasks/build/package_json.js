module.exports = function (grunt) {
  const pkg = grunt.config.get('pkg');

  grunt.registerTask('_build:packageJson', function () {
    const { sha, number, version, timestamp } = grunt.config.get('build'); // kibi: adds timestamp

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords,
        version,
        kibi_version: pkg.kibi_version, // kibi: added to manage kibi version
        kibi_kibana_announcement: pkg.kibi_kibana_announcement, // kibi: added by kibi
        compatible_es_versions: pkg.compatible_es_versions, // kibi: added by kibi
        branch: pkg.branch,
        build: {
          number,
          sha,
          timestamp // kibi: adds timestamp
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
