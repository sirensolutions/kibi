module.exports = function (grunt) {
  var _ = require('lodash');
  var archiveName = function (plugin) {
    return '<%= target %>/<%= pkg.name %>-' + (plugin ? 'plugin-' : '') + '<%= pkg.version %>';
  };

  return _.mapValues({
    build_zip: archiveName() + '.zip',
    build_tarball: archiveName() + '.tar.gz',
    plugin: archiveName(true) + '.tar.gz'
  }, function (filename, task) {
    return {
      options: {
        archive: filename
      },
      files: [
        {
          flatten: true,
          src: '<%= build %>/dist/bin/<%= pkg.name %>',
          dest: '<%= pkg.name %>/bin/<%= pkg.name %>',
          mode: 755
        },
        {
          flatten: true,
          src: '<%= build %>/dist/bin/<%= pkg.name %>.bat',
          dest: '<%= pkg.name %>/bin/<%= pkg.name %>.bat'
        },
        {
          flatten: true,
          src: '<%= build %>/dist/bin/replace_encryption_key.sh',
          dest: '<%= pkg.name %>/bin/replace_encryption_key.sh',
          mode: 755
        },
        {
          flatten: true,
          src: '<%= build %>/dist/bin/replace_encryption_key.bat',
          dest: '<%= pkg.name %>/bin/replace_encryption_key.bat'
        },
        {
          expand: true,
          cwd: '<%= build %>/dist/config',
          src: ['**/*'],
          dest: '<%= pkg.name %>/config'
        },
        {
          expand: true,
          cwd: '<%= build %>/dist/lib',
          src: ['**/*'],
          dest: '<%= pkg.name %>/lib'
        },
        {
          expand: true,
          cwd: '<%= build %>/dist',
          src: ['*.txt'],
          dest: '<%= pkg.name %>'
        }
      ]
    };
  });
};
